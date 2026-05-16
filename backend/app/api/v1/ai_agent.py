import asyncio
import json
import logging
from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from vcommerce_ai_agent import VCommerceAgent

from app.api.deps import get_db
from app.core.config import settings
from app.crud.ai_agent import create_or_update_session, get_session_by_session_id
from app.schemas.ai_agent import (
    AgentResponseSchema,
    AskRequest,
    SuggestionsRequest,
    SuggestionsResponse,
)

router = APIRouter()

# Tabelas operacionais do backend que nao devem ser expostas ao LLM nem
# permitidas pelos guardrails do agente (alembic_version e ai_agent_sessions
# contem dados internos e historico de outras conversas).
_EXCLUDED_TABLES: set[str] = {"ai_agent_sessions", "alembic_version"}

# Lock por session_id para serializar perguntas simultaneas na mesma conversa
_session_locks: dict[str, asyncio.Lock] = {}


def _get_lock(session_id: str) -> asyncio.Lock:
    if session_id not in _session_locks:
        _session_locks[session_id] = asyncio.Lock()
    return _session_locks[session_id]


@router.post(
    "/ask",
    response_model=AgentResponseSchema,
    summary="Pergunta ao agente de IA",
    response_description=(
        "Resposta estruturada do agente. O HTTP status é sempre 200; "
        "o frontend deve verificar o campo `status` para success, error ou "
        "out_of_scope."
    ),
    responses={
        422: {
            "description": "Payload inválido (faltam `question` ou `session_id`)."
        }
    },
)
async def ask_agent(
    payload: AskRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Envia uma pergunta em linguagem natural (PT-BR) ao agente Text-to-SQL.

    O agente gera SQL dinamicamente, executa no banco e retorna um insight
    pronto para exibição em `user_response.answer_text`. Quando aplicável,
    devolve também os dados brutos em `user_response.data` e uma sugestão
    de gráfico em `user_response.chart`.

    O histórico da conversa é persistido automaticamente em `ai_agent_sessions`
    apenas quando `status == 'success'`, permitindo follow-ups na mesma
    `session_id`. Requisições simultâneas para a mesma sessão são serializadas
    por lock em memória.

    Erros de domínio (pergunta fora de escopo, falha na geração de SQL,
    timeout etc.) chegam sempre como HTTP 200 com `status` != 'success',
    e a propriedade `user_response.answer_text` trará uma mensagem
    amigável mapeada a partir do código de erro.
    Os detalhes técnicos (SQL gerado, tempos, código de erro, tokens) ficam
    restritos ao backend, registrados via logger `vcommerce_ai_agent`, e não
    são enviados ao frontend.
    """
    lock = _get_lock(payload.session_id)
    async with lock:
        # Recupera historico persistido
        db_session = await get_session_by_session_id(db, payload.session_id)
        history: list[dict[str, str | None]] = []
        if db_session and db_session.history_json:
            try:
                history = json.loads(db_session.history_json)
                if not isinstance(history, list):
                    history = []
            except json.JSONDecodeError:
                history = []

        agent = VCommerceAgent(
            db_path=settings.DB_PATH,
            schema_descriptions_path=settings.SCHEMA_DESCRIPTIONS_PATH,
            excluded_tables=_EXCLUDED_TABLES,
        )

        if history:
            try:
                agent.import_history(history)
            except ValueError as exc:
                logging.getLogger(__name__).warning(
                    "Falha ao importar historico da sessao %s: %s",
                    payload.session_id,
                    exc,
                )
                agent.clear_history()

        response = await agent.ask(payload.question)

        if response.status == "success":
            await create_or_update_session(
                db,
                session_id=payload.session_id,
                history_json=json.dumps(
                    agent.export_history(), ensure_ascii=False
                ),
            )
        else:
            if response.developer_debug:
                logging.getLogger("vcommerce_ai_agent").error(
                    "Erro ao processar pergunta no agente de IA",
                    extra={"developer_debug": asdict(response.developer_debug)}
                )
                
            if response.developer_debug and response.developer_debug.error:
                code = response.developer_debug.error.code
                if code == "EMPTY_INPUT":
                    response.user_response.answer_text = "Por favor, digite uma pergunta válida."
                elif code == "INPUT_TOO_LONG":
                    response.user_response.answer_text = "Sua pergunta é muito longa. Tente ser mais breve."
                elif code == "INVALID_INPUT_TYPE":
                    response.user_response.answer_text = "O formato da pergunta enviada é inválido."
                elif code in ("PROMPT_INJECTION", "DESTRUCTIVE_QUERY", "MULTIPLE_STATEMENTS", "UNKNOWN_GUARDRAIL"):
                    response.user_response.answer_text = "A sua pergunta não pôde ser processada por motivos de segurança."
                elif code in ("SCHEMA_VIOLATION_ALLOWLIST", "SCHEMA_VIOLATION_SEMANTIC"):
                    response.user_response.answer_text = "Sua pergunta refere-se a informações que não estão disponíveis para consulta."
                elif code == "SENSITIVE_DATA_MASKING_ERROR":
                    response.user_response.answer_text = "Não é permitido analisar ou cruzar os dados sensíveis solicitados."
                elif code in ("LLM_RATE_LIMIT_ERROR", "LLM_QUOTA_ERROR"):
                    response.user_response.answer_text = "Muitas requisições no momento. Aguarde um instante e tente novamente."
                elif code in ("LLM_TIMEOUT_ERROR", "EXECUTION_TIMEOUT"):
                    response.user_response.answer_text = "A consulta demorou demais e foi interrompida. Tente uma pergunta mais específica."
                elif code in ("LLM_UNAVAILABLE_ERROR", "LLM_INTERNAL_ERROR"):
                    response.user_response.answer_text = "O serviço de inteligência artificial está temporariamente indisponível."
                elif code == "LLM_AUTHENTICATION_ERROR":
                    response.user_response.answer_text = "Erro de autenticação com o provedor de IA. Contate o suporte."
                elif code == "LLM_INVALID_REQUEST_ERROR":
                    response.user_response.answer_text = "Erro na requisição enviada ao provedor de IA."
                elif code == "LLM_UNKNOWN_ERROR":
                    response.user_response.answer_text = "Ocorreu um erro desconhecido no serviço de IA."
                elif code == "SQL_PARSE_ERROR":
                    response.user_response.answer_text = "Houve uma dificuldade em interpretar sua pergunta. Pode tentar reescrevê-la de outra forma?"
                elif code == "INSIGHT_PARSE_ERROR":
                    response.user_response.answer_text = "Houve uma dificuldade em processar a resposta. Tente novamente."
                elif code == "DB_EXECUTION_ERROR":
                    response.user_response.answer_text = "Ocorreu um erro ao executar a consulta no banco de dados."
                elif code == "SCHEMA_LOAD_ERROR":
                    response.user_response.answer_text = "Ocorreu um erro ao carregar as definições do banco de dados."
                else:
                    response.user_response.answer_text = "Ocorreu uma falha no processamento. Tente novamente ou contate o suporte."

    return {
        "status": response.status,
        "user_response": asdict(response.user_response),
    }


@router.post(
    "/suggestions",
    response_model=SuggestionsResponse,
    summary="Lista sugestões iniciais de perguntas",
    response_description="Lista de 5 perguntas em PT-BR baseadas no schema real do banco.",
)
async def get_suggestions(
    payload: SuggestionsRequest,
) -> SuggestionsResponse:
    """
    Retorna 5 sugestões de perguntas que o usuário pode fazer ao agente.

    As sugestões são geradas pelo LLM a partir do schema do banco. Para evitar
    repetição entre cliques do botão de 'mais sugestões', envie em
    `previous_suggestions` as perguntas que já foram apresentadas nesta sessão.
    """
    agent = VCommerceAgent(
        db_path=settings.DB_PATH,
        schema_descriptions_path=settings.SCHEMA_DESCRIPTIONS_PATH,
        excluded_tables=_EXCLUDED_TABLES,
    )

    suggestions = await agent.initial_suggestions(
        previous_suggestions=payload.previous_suggestions or None
    )

    return SuggestionsResponse(suggestions=suggestions)
