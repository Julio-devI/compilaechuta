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
    timeout etc.) chegam sempre como HTTP 200 com `status` != 'success'.
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

        # Instancia o agente
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

        # Processa a pergunta
        response = await agent.ask(payload.question)

        # Persiste o historico atualizado apenas quando o agente registrou
        # a interacao (apenas status=success entra no historico, conforme contrato).
        if response.status == "success":
            await create_or_update_session(
                db,
                session_id=payload.session_id,
                history_json=json.dumps(
                    agent.export_history(), ensure_ascii=False
                ),
            )

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
