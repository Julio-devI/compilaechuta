import asyncio
import json
import logging
import time
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

_ERROR_MESSAGES: dict[str, str] = {
    "EMPTY_INPUT": "Por favor, digite uma pergunta válida.",
    "INPUT_TOO_LONG": "Sua pergunta é muito longa. Tente ser mais breve.",
    "INVALID_INPUT_TYPE": "O formato da pergunta enviada é inválido.",
    "PROMPT_INJECTION": "A sua pergunta não pôde ser processada por motivos de segurança.",
    "DESTRUCTIVE_QUERY": "A sua pergunta não pôde ser processada por motivos de segurança.",
    "MULTIPLE_STATEMENTS": "A sua pergunta não pôde ser processada por motivos de segurança.",
    "UNKNOWN_GUARDRAIL": "A sua pergunta não pôde ser processada por motivos de segurança.",
    "SCHEMA_VIOLATION_ALLOWLIST": "Sua pergunta refere-se a informações que não estão disponíveis para consulta.",
    "SCHEMA_VIOLATION_SEMANTIC": "Sua pergunta refere-se a informações que não estão disponíveis para consulta.",
    "SENSITIVE_DATA_MASKING_ERROR": "Não é permitido analisar ou cruzar os dados sensíveis solicitados.",
    "LLM_RATE_LIMIT_ERROR": "Muitas requisições no momento. Aguarde um instante e tente novamente.",
    "LLM_QUOTA_ERROR": "Muitas requisições no momento. Aguarde um instante e tente novamente.",
    "LLM_TIMEOUT_ERROR": "A consulta demorou demais e foi interrompida. Tente uma pergunta mais específica.",
    "EXECUTION_TIMEOUT": "A consulta demorou demais e foi interrompida. Tente uma pergunta mais específica.",
    "LLM_UNAVAILABLE_ERROR": "O serviço de inteligência artificial está temporariamente indisponível.",
    "LLM_INTERNAL_ERROR": "O serviço de inteligência artificial está temporariamente indisponível.",
    "LLM_AUTHENTICATION_ERROR": "Erro de autenticação com o provedor de IA. Contate o suporte.",
    "LLM_INVALID_REQUEST_ERROR": "Erro na requisição enviada ao provedor de IA.",
    "LLM_UNKNOWN_ERROR": "Ocorreu um erro desconhecido no serviço de IA.",
    "SQL_PARSE_ERROR": "Houve uma dificuldade em interpretar sua pergunta. Pode tentar reescrevê-la de outra forma?",
    "INSIGHT_PARSE_ERROR": "Houve uma dificuldade em processar a resposta. Tente novamente.",
    "DB_EXECUTION_ERROR": "Ocorreu um erro ao executar a consulta no banco de dados.",
    "SCHEMA_LOAD_ERROR": "Ocorreu um erro ao carregar as definições do banco de dados.",
}

# Locks em memoria do processo: garantem serializacao de requisicoes
# concorrentes na mesma session_id em /ask e leitura consistente em
# /suggestions. Sao limpos periodicamente para evitar vazamento, ja que
# o dicionario cresce monotonicamente com novas sessoes.
_session_locks: dict[str, asyncio.Lock] = {}
_session_lock_last_used: dict[str, float] = {}
_LOCK_IDLE_TTL_SECONDS = 1800
_LOCK_CLEANUP_INTERVAL_SECONDS = 300


def _get_lock(session_id: str) -> asyncio.Lock:
    _session_lock_last_used[session_id] = time.monotonic()
    if session_id not in _session_locks:
        _session_locks[session_id] = asyncio.Lock()
    return _session_locks[session_id]


def _evict_stale_session_locks() -> int:
    now = time.monotonic()
    stale: list[str] = []
    for session_id, last_used in list(_session_lock_last_used.items()):
        if now - last_used < _LOCK_IDLE_TTL_SECONDS:
            continue
        lock = _session_locks.get(session_id)
        if lock is None or lock.locked():
            continue
        stale.append(session_id)
    for session_id in stale:
        _session_locks.pop(session_id, None)
        _session_lock_last_used.pop(session_id, None)
    return len(stale)


async def cleanup_session_locks_loop() -> None:
    logger = logging.getLogger("vcommerce_ai_agent")
    while True:
        try:
            await asyncio.sleep(_LOCK_CLEANUP_INTERVAL_SECONDS)
            removed = _evict_stale_session_locks()
            if removed:
                logger.info(
                    "Removidos %d locks de sessoes inativas (TTL=%ds)",
                    removed,
                    _LOCK_IDLE_TTL_SECONDS,
                )
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Falha no loop de limpeza de locks de sessao")


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

    O histórico da conversa é persistido automaticamente no backend apenas
    quando `status == 'success'`, permitindo follow-ups na mesma
    `session_id`. Requisições simultâneas para a mesma sessão são
    processadas em ordem.

    Erros técnicos (falhas no processamento da pergunta, timeout, validações
    de segurança etc.) chegam como HTTP 200 com `status == 'error'` e
    `user_response.answer_text` preenchido com uma mensagem amigável
    mapeada do código de erro. Quando a pergunta está fora do escopo do
    agente, `status` é `'out_of_scope'` e `user_response.answer_text` traz
    a explicação devolvida pelo próprio agente, sem mapeamento adicional.

    Os detalhes técnicos da execução ficam restritos ao backend, registrados
    nos logs internos, e não são enviados ao frontend.
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
                response.user_response.answer_text = _ERROR_MESSAGES.get(
                    code,
                    "Ocorreu uma falha no processamento. Tente novamente ou contate o suporte."
                )

    return {
        "status": response.status,
        "session_id": payload.session_id,
        "user_response": asdict(response.user_response),
    }


@router.post(
    "/suggestions",
    response_model=SuggestionsResponse,
    summary="Sugestões de perguntas para o chat",
    response_description=(
        "Lista de 5 perguntas em PT-BR. Sem session_id retorna a lista fixa "
        "inicial; com session_id válido gera follow-ups contextuais via LLM."
    ),
    responses={
        200: {
            "description": (
                "Lista de 5 sugestões. Sem histórico retorna as perguntas "
                "padrão; com histórico gera follow-ups contextuais via LLM."
            ),
            "content": {
                "application/json": {
                    "examples": {
                        "sem_historico": {
                            "summary": "Sugestões iniciais (sem session_id)",
                            "value": {
                                "suggestions": [
                                    "Qual é a receita total agrupada por região do país?",
                                    "Quais são os principais clientes do segmento 'Campeões' que mais gastaram na loja?",
                                    "Qual é o tempo médio de resolução de tickets por tipo de problema?",
                                    "Quais são os 10 produtos com a melhor média de avaliação dos clientes?",
                                    "Quais canais de aquisição geram o maior número de compras e adições ao carrinho?",
                                ]
                            },
                        },
                        "com_historico": {
                            "summary": "Follow-ups contextuais (com session_id ativo)",
                            "value": {
                                "suggestions": [
                                    "Qual região teve o maior crescimento de receita no último trimestre?",
                                    "Quais produtos da região Sudeste têm a maior margem de lucro?",
                                    "Como a receita por região se compara ao mesmo período do ano anterior?",
                                    "Quais são os 5 estados com maior ticket médio de compra?",
                                    "Existe correlação entre a região do cliente e o canal de aquisição preferido?",
                                ]
                            },
                        },
                    }
                }
            },
        },
        422: {
            "description": (
                "Payload inválido. Como `session_id` é opcional e tem default "
                "vazio, este código só ocorre se o campo for enviado com tipo "
                "diferente de string."
            )
        },
    },
)
async def get_suggestions(
    payload: SuggestionsRequest,
    db: AsyncSession = Depends(get_db),
) -> SuggestionsResponse:
    """
    Retorna 5 sugestões de perguntas que o usuário pode fazer ao agente.

    Quando `session_id` é vazio ou a sessão não possui histórico, retorna
    a lista fixa inicial sem chamar o LLM. Quando o histórico da sessão
    existe, gera 5 perguntas de follow-up contextuais via LLM.
    """
    history: list[dict[str, str | None]] = []

    if payload.session_id:
        async with _get_lock(payload.session_id):
            db_session = await get_session_by_session_id(db, payload.session_id)
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

    suggestions = await agent.initial_suggestions(
        history=history or None,
    )

    return SuggestionsResponse(suggestions=suggestions)
