import asyncio
import json
import logging
import time
from dataclasses import asdict
from datetime import timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from vcommerce_ai_agent import VCommerceAgent

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.crud.ai_agent import (
    create_or_update_session,
    delete_session,
    get_session,
    list_sessions_by_user,
)
from app.schemas.ai_agent import (
    AgentResponseSchema,
    AskRequest,
    SessionDetailResponse,
    SessionSummary,
    SessionsListResponse,
    SuggestionsRequest,
    SuggestionsResponse,
)

router = APIRouter()

# Tabelas operacionais do backend que nao devem ser expostas ao LLM nem
# permitidas pelos guardrails do agente. ai_agent_sessions e alembic_version
# contem dados internos do agente e historico de outras conversas;
# gold_operador contem credenciais (senha_hash) e PII dos operadores.
_EXCLUDED_TABLES: set[str] = {
    "ai_agent_sessions",
    "alembic_version",
    "gold_operador",
}

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
    "LLM_QUOTA_ERROR": "O agente está indisponível no momento. Por favor, tente novamente amanhã.",
    "LLM_TIMEOUT_ERROR": "A consulta demorou demais e foi interrompida. Tente uma pergunta mais específica.",
    "EXECUTION_TIMEOUT": "A consulta demorou demais e foi interrompida. Tente uma pergunta mais específica.",
    "LLM_UNAVAILABLE_ERROR": "O agente está passando por instabilidades. Aguarde um momento e tente novamente.",
    "LLM_INTERNAL_ERROR": "O agente está passando por instabilidades. Aguarde um momento e tente novamente.",
    "LLM_AUTHENTICATION_ERROR": "O agente está indisponível no momento. Por favor, contate o suporte.",
    "LLM_INVALID_REQUEST_ERROR": "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.",
    "LLM_UNKNOWN_ERROR": "Ocorreu uma falha inesperada. Por favor, tente novamente mais tarde.",
    "SQL_PARSE_ERROR": "Houve uma dificuldade em interpretar sua pergunta. Pode tentar reescrevê-la de outra forma?",
    "INSIGHT_PARSE_ERROR": "Houve uma dificuldade em formatar a resposta. Por favor, tente novamente.",
    "DB_EXECUTION_ERROR": "Não foi possível buscar as informações solicitadas no momento. Tente novamente mais tarde.",
    "SCHEMA_LOAD_ERROR": "O agente não pôde ser iniciado corretamente. Por favor, contate o suporte.",
}

# Locks em memoria do processo: garantem serializacao de requisicoes
# concorrentes no mesmo par (user_id, session_id) em /ask e leitura
# consistente em /suggestions. A chave composta evita colisoes entre
# usuarios distintos que escolham o mesmo session_id. Sao limpos
# periodicamente para evitar vazamento, ja que o dicionario cresce
# monotonicamente com novas sessoes.
_session_locks: dict[str, asyncio.Lock] = {}
_session_lock_last_used: dict[str, float] = {}
_LOCK_IDLE_TTL_SECONDS = 1800
_LOCK_CLEANUP_INTERVAL_SECONDS = 300


def _lock_key(user_id: str, session_id: str) -> str:
    return f"{user_id}:{session_id}"


def _get_lock(user_id: str, session_id: str) -> asyncio.Lock:
    key = _lock_key(user_id, session_id)
    _session_lock_last_used[key] = time.monotonic()
    if key not in _session_locks:
        _session_locks[key] = asyncio.Lock()
    return _session_locks[key]


def _evict_stale_session_locks() -> int:
    now = time.monotonic()
    stale: list[str] = []
    for key, last_used in list(_session_lock_last_used.items()):
        if now - last_used < _LOCK_IDLE_TTL_SECONDS:
            continue
        lock = _session_locks.get(key)
        if lock is None or lock.locked():
            continue
        stale.append(key)
    for key in stale:
        _session_locks.pop(key, None)
        _session_lock_last_used.pop(key, None)
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


def _derive_title(history_json: str | None) -> str:
    """Deriva o título da sessão a partir da primeira pergunta do usuário."""
    if not history_json:
        return "Sessão sem título"
    try:
        history = json.loads(history_json)
    except json.JSONDecodeError:
        return "Sessão sem título"
    if not isinstance(history, list):
        return "Sessão sem título"
    for entry in history:
        if not isinstance(entry, dict):
            continue
        if entry.get("role") != "user":
            continue
        content = entry.get("content")
        if not isinstance(content, str) or not content.strip():
            continue
        stripped = content.strip()
        if len(stripped) <= 60:
            return stripped
        return stripped[:60].rstrip() + "…"
    return "Sessão sem título"


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
        401: {"description": "Token JWT ausente ou inválido."},
        422: {
            "description": "Payload inválido (faltam `question` ou `session_id`)."
        },
    },
)
async def ask_agent(
    payload: AskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Envia uma pergunta em linguagem natural (PT-BR) ao agente Text-to-SQL.

    O agente gera SQL dinamicamente, executa no banco e retorna um insight
    pronto para exibição em `user_response.answer_text`. Quando aplicável,
    devolve também os dados brutos em `user_response.data` e uma sugestão
    de gráfico em `user_response.chart`.

    O histórico da conversa é persistido automaticamente no backend apenas
    quando `status == 'success'`, atrelado ao par (user_id, session_id),
    permitindo follow-ups na mesma `session_id` sem misturar conversas de
    usuários distintos. Requisições simultâneas para a mesma sessão do
    mesmo usuário são processadas em ordem.

    Erros técnicos (falhas no processamento da pergunta, timeout, validações
    de segurança etc.) chegam como HTTP 200 com `status == 'error'` e
    `user_response.answer_text` preenchido com uma mensagem amigável
    agente, `status` é `'out_of_scope'` e `user_response.answer_text` é
    substituído por uma mensagem padrão, garantindo que não haja
    vazamento de detalhes de implementação.

    Os detalhes técnicos da execução ficam restritos ao backend, registrados
    nos logs internos, e não são enviados ao frontend.
    """
    user_id = current_user["sub"]
    lock = _get_lock(user_id, payload.session_id)
    async with lock:
        db_session = await get_session(db, user_id, payload.session_id)
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
            schema_descriptions_path=settings.AI_AGENT_SCHEMA_DESCRIPTIONS_PATH,
            excluded_tables=_EXCLUDED_TABLES,
        )

        if history:
            try:
                agent.import_history(history)
            except ValueError as exc:
                logging.getLogger(__name__).warning(
                    "Falha ao importar historico",
                    extra={
                        "user_id": user_id,
                        "session_id": payload.session_id,
                        "error": str(exc),
                    },
                )
                agent.clear_history()

        response = await agent.ask(payload.question)

        if response.status == "success":
            await create_or_update_session(
                db,
                user_id=user_id,
                session_id=payload.session_id,
                history_json=json.dumps(
                    agent.export_history(), ensure_ascii=False
                ),
            )
        else:
            if response.developer_debug:
                logging.getLogger("vcommerce_ai_agent").error(
                    "Erro ao processar pergunta no agente de IA",
                    extra={
                        "user_id": user_id,
                        "session_id": payload.session_id,
                        "developer_debug": asdict(response.developer_debug),
                    },
                )

            if response.developer_debug and response.developer_debug.error:
                code = response.developer_debug.error.code
                response.user_response.answer_text = _ERROR_MESSAGES.get(
                    code,
                    "Ocorreu uma falha no processamento. Tente novamente ou contate o suporte.",
                )
            elif response.status == "out_of_scope":
                response.user_response.answer_text = (
                    "Desculpe, meu escopo é **focado na visão do cliente e operações "
                    "comerciais**, portanto não tenho acesso a dados financeiros internos, "
                    "de recursos humanos ou fluxo de caixa da V-Commerce, mas posso "
                    "ajudar com indicadores de vendas e operações."
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
        401: {"description": "Token JWT ausente ou inválido."},
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
    current_user: dict = Depends(get_current_user),
) -> SuggestionsResponse:
    """
    Retorna 5 sugestões de perguntas que o usuário pode fazer ao agente.

    Quando `session_id` é vazio ou a sessão não possui histórico, retorna
    a lista fixa inicial sem chamar o LLM. Quando o histórico da sessão
    existe, gera 5 perguntas de follow-up contextuais via LLM.
    """
    user_id = current_user["sub"]
    history: list[dict[str, str | None]] = []

    if payload.session_id:
        async with _get_lock(user_id, payload.session_id):
            db_session = await get_session(db, user_id, payload.session_id)
            if db_session and db_session.history_json:
                try:
                    history = json.loads(db_session.history_json)
                    if not isinstance(history, list):
                        history = []
                except json.JSONDecodeError:
                    history = []

    agent = VCommerceAgent(
        db_path=settings.DB_PATH,
        schema_descriptions_path=settings.AI_AGENT_SCHEMA_DESCRIPTIONS_PATH,
        excluded_tables=_EXCLUDED_TABLES,
    )

    suggestions = await agent.initial_suggestions(
        history=history or None,
    )

    return SuggestionsResponse(suggestions=suggestions)


@router.get(
    "/sessions",
    response_model=SessionsListResponse,
    summary="Lista as sessões de chat do usuário autenticado",
    response_description=(
        "Sessões do usuário ordenadas por updated_at decrescente. "
        "Cada item traz session_id, title derivado da primeira pergunta "
        "e updated_at."
    ),
    responses={401: {"description": "Token JWT ausente ou inválido."}},
)
async def list_user_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> SessionsListResponse:
    user_id = current_user["sub"]
    rows = await list_sessions_by_user(db, user_id)
    summaries = [
        SessionSummary(
            session_id=row.session_id,
            title=_derive_title(row.history_json),
            updated_at=row.updated_at.replace(tzinfo=timezone.utc) if row.updated_at else None,
        )
        for row in rows
    ]
    return SessionsListResponse(sessions=summaries)


@router.get(
    "/sessions/{session_id}",
    response_model=SessionDetailResponse,
    summary="Recupera o histórico completo de uma sessão",
    response_description=(
        "Histórico alternado user/assistant no formato exportado pelo agente."
    ),
    responses={
        401: {"description": "Token JWT ausente ou inválido."},
        404: {"description": "Sessão não encontrada para este usuário."},
    },
)
async def get_user_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> SessionDetailResponse:
    user_id = current_user["sub"]
    row = await get_session(db, user_id, session_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão não encontrada.",
        )
    try:
        history = json.loads(row.history_json) if row.history_json else []
        if not isinstance(history, list):
            history = []
    except json.JSONDecodeError:
        history = []
    return SessionDetailResponse(session_id=session_id, history=history)


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove uma sessão de chat do usuário autenticado",
    responses={
        204: {"description": "Sessão removida com sucesso."},
        401: {"description": "Token JWT ausente ou inválido."},
        404: {"description": "Sessão não encontrada para este usuário."},
    },
)
async def delete_user_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> None:
    user_id = current_user["sub"]
    async with _get_lock(user_id, session_id):
        deleted = await delete_session(db, user_id, session_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão não encontrada.",
        )
