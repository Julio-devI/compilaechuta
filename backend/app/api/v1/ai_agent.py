import asyncio
import json
import logging
from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

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

# Lock por session_id para serializar perguntas simultaneas na mesma conversa
_session_locks: dict[str, asyncio.Lock] = {}


def _get_lock(session_id: str) -> asyncio.Lock:
    if session_id not in _session_locks:
        _session_locks[session_id] = asyncio.Lock()
    return _session_locks[session_id]


@router.post("/ask", response_model=AgentResponseSchema)
async def ask_agent(
    payload: AskRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Recebe uma pergunta em linguagem natural e retorna uma resposta estruturada
    gerada pelo agente de IA Text-to-SQL.
    """
    try:
        from vcommerce_ai_agent import VCommerceAgent
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Modulo ai-agent nao disponivel. Verifique a instalacao.",
        ) from exc

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
            excluded_tables=set(),
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

        # Persiste o historico atualizado
        updated_history = agent.export_history()
        if updated_history:
            await create_or_update_session(
                db,
                session_id=payload.session_id,
                history_json=json.dumps(updated_history, ensure_ascii=False),
            )

    return asdict(response)


@router.post("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(
    payload: SuggestionsRequest,
) -> SuggestionsResponse:
    """
    Retorna sugestoes iniciais de perguntas baseadas no schema do banco.
    """
    try:
        from vcommerce_ai_agent import VCommerceAgent
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Modulo ai-agent nao disponivel. Verifique a instalacao.",
        ) from exc

    agent = VCommerceAgent(
        db_path=settings.DB_PATH,
        schema_descriptions_path=settings.SCHEMA_DESCRIPTIONS_PATH,
        excluded_tables=set(),
    )

    suggestions = await agent.initial_suggestions(
        previous_suggestions=payload.previous_suggestions or None
    )

    return SuggestionsResponse(suggestions=suggestions)
