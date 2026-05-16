"""
Classe pública do agente de IA.

Orquestra as duas chamadas ao LLM (geração de SQL e geração de insight)
e expõe a interface consumida pelo backend FastAPI.
"""

import asyncio
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from sqlglot import exp, parse_one

from vcommerce_ai_agent.core import config
from vcommerce_ai_agent.core.logger import logger
from vcommerce_ai_agent.database.db import Database
from vcommerce_ai_agent.core.exceptions import (
    ErrorCode,
    GuardrailError,
    LLMAuthenticationError,
    LLMError,
    LLMInternalError,
    LLMInvalidRequestError,
    LLMParseError,
    LLMQuotaError,
    LLMRateLimitError,
    LLMTimeoutError,
    LLMUnavailableError,
    LLMUnknownError,
)
from vcommerce_ai_agent.security.guardrails import (
    apply_layer_2,
    validate_empty_input,
    validate_input_length,
    validate_prompt_injection,
)
from vcommerce_ai_agent.security.sensitive_data_masking import (
    mask_sensitive_data,
    restore_sensitive_values,
)
from vcommerce_ai_agent.llm.insight_generator import generate_insight
from vcommerce_ai_agent.database.schema import build_allowlist, format_schema, load_descriptions
from vcommerce_ai_agent.llm.sql_generator import generate_sql, generate_sql_correction
from vcommerce_ai_agent.llm.suggestions_generator import (
    INITIAL_SUGGESTIONS,
    generate_suggestions,
)


@dataclass
class ChartSuggestion:
    """Sugestão de visualização gráfica para o frontend."""

    type: Literal["bar", "line", "pie", "area"]
    x_axis: str | None
    y_axis: str | None
    title: str


@dataclass
class _ResponseSection:
    """Seção textual interna usada para montar a resposta ao usuário."""

    title: str
    content: str


@dataclass
class _DataSource:
    """Tabela consultada para compor o texto de fontes."""

    table: str
    label: str | None


@dataclass
class _SourcesSummary:
    """Resumo interno das fontes de dados usadas na resposta."""

    text: str
    tables: list[_DataSource]


@dataclass
class _ResponsePresentation:
    """Estrutura textual interna derivada da resposta do LLM."""

    activity: str
    answer_sections: list[_ResponseSection]
    sources_summary: _SourcesSummary | None


@dataclass
class ResponseError:
    """Erro estruturado retornado ao backend."""

    code: str
    message: str
    stage: Literal[
        "input",
        "schema",
        "sql_generation",
        "sql_validation",
        "database",
        "insight_generation",
        "llm",
    ]
    retryable: bool


@dataclass
class UserResponse:
    """Payload seguro para exibição ao usuário final."""

    answer_text: str
    sources_text: str | None
    data: list[dict] | None
    chart: ChartSuggestion | None
    truncated: bool


@dataclass
class DeveloperDebug:
    """Payload técnico para logs, auditoria e troubleshooting."""

    sql: str
    error: ResponseError | None
    total_time_ms: float | None = None
    sql_generation_time_ms: float | None = None
    query_execution_time_ms: float | None = None
    insight_generation_time_ms: float | None = None
    tokens_used: int | None = None


@dataclass
class AgentResponse:
    """Resposta completa do agente para uma pergunta do usuário."""

    status: Literal["success", "error", "out_of_scope"]
    user_response: UserResponse
    developer_debug: DeveloperDebug


def _error_code_value(code: str | ErrorCode) -> str:
    """Normaliza códigos internos para string serializável."""
    return code.value if isinstance(code, ErrorCode) else str(code)


def _build_answer_text_from_presentation(
    presentation: _ResponsePresentation | None,
) -> str:
    """Monta o texto principal sem o resumo das fontes consultadas."""
    if presentation is None:
        return ""

    parts = [presentation.activity.strip()]
    for section in presentation.answer_sections:
        parts.append(f"{section.title}: {section.content}")
    return "\n\n".join(part for part in parts if part)



def _format_source_label(label: str) -> str:
    """Formata aliases de fontes em Title Case adequado para UI."""
    lower = label.strip().lower()
    words = lower.split()
    if not words:
        return label

    small_words = {"de", "da", "do", "das", "dos", "e", "com", "por", "para"}
    formatted = [
        word if index > 0 and word in small_words else word.capitalize()
        for index, word in enumerate(words)
    ]
    return " ".join(formatted)


_MAX_SOURCES_TEXT_CHARS = 280


def _limit_sources_text(text: str) -> str:
    """Limita o texto de fontes para manter leitura curta no frontend."""
    if len(text) <= _MAX_SOURCES_TEXT_CHARS:
        return text

    shortened = text[: _MAX_SOURCES_TEXT_CHARS - 3].rsplit(" ", 1)[0].rstrip(" .,;")
    return shortened + "..."


def _strip_out_of_scope_marker(text: str) -> str:
    """Remove o marcador técnico de fora de escopo antes de exibir ao usuário."""
    marker = config.OUT_OF_SCOPE_MARKER
    stripped = text.strip()
    if stripped.upper().startswith(marker):
        stripped = stripped[len(marker):].strip(" :-\n\t")
    return stripped or "Não consigo responder essa pergunta com os dados disponíveis."


_HIDDEN_TABLE_SCOPE_PATTERNS = (
    re.compile(
        r"\btabelas?\b.{0,120}\b(ocult[ao]s?|intern[ao]s?|"
        r"n[aã]o\s+listad[ao]s?|fora\s+do\s+schema)\b",
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r"\b(ocult[ao]s?|intern[ao]s?|n[aã]o\s+listad[ao]s?|"
        r"fora\s+do\s+schema)\b.{0,120}\btabelas?\b",
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r"\btables?\b.{0,120}\b(hidden|internal|unlisted|outside\s+the\s+schema)\b",
        re.IGNORECASE | re.DOTALL,
    ),
)


def _is_hidden_table_scope_request(question: str) -> bool:
    """Detecta pedidos por tabelas ocultas/internas fora do schema autorizado."""
    return any(pattern.search(question) for pattern in _HIDDEN_TABLE_SCOPE_PATTERNS)


class VCommerceAgent:
    """Agente Text-to-SQL para o domínio V-Commerce."""

    _MAX_LAYER2_RETRIES: int = 3
    _GENERIC_ERROR_MSG: str = (
        "Não foi possível processar sua pergunta. Tente reformulá-la."
    )

    def __init__(
        self,
        db_path: str,
        excluded_tables: set[str] | None = None,
        max_rows: int = config.MAX_ROWS,
        query_timeout_seconds: int = config.QUERY_TIMEOUT_SECONDS,
        llm_model: str = config.LLM_MODEL,
        schema_descriptions_path: str | Path | None = None,
    ) -> None:
        """
        Inicializa o agente com o caminho do banco de dados.

        Args:
            db_path: Caminho absoluto ou relativo para o arquivo SQLite.
            excluded_tables: Conjunto de nomes de tabelas a omitir do schema
                enviado ao LLM e do allowlist dos guardrails. Controlado
                pelo backend.
            max_rows: Número máximo de linhas retornadas por query.
            query_timeout_seconds: Timeout em segundos para execução de queries.
            llm_model: Identificador do modelo Gemini a ser usado.
            schema_descriptions_path: Caminho opcional para um JSON externo
                com descrições, aliases e exemplos do schema. Se omitido,
                usa o arquivo padrão empacotado no módulo.
        """
        self._db = Database(
            db_path,
            max_rows=max_rows,
            query_timeout_seconds=query_timeout_seconds,
        )
        self._max_rows = max_rows
        self._excluded_tables: set[str] = excluded_tables or set()
        self._llm_model = llm_model
        self._schema_descriptions_path = schema_descriptions_path
        self._schema_text: str | None = None
        self._technical_schema: dict[str, Any] | None = None
        self._descriptions: dict[str, Any] | None = None
        self._history: list[dict[str, str | None]] = []

    def invalidate_schema(self) -> None:
        """Limpa o cache do schema, forçando recarregamento na próxima consulta."""
        self._schema_text = None
        self._technical_schema = None
        self._descriptions = None

    def clear_history(self) -> None:
        """Limpa o histórico de conversa, iniciando uma nova sessão."""
        self._history = []

    def export_history(self) -> list[dict[str, str | None]]:
        """
        Exporta o histórico atual em formato serializável (JSON-compatível).

        Retorna lista de dicts com campos:
            - role: 'user' | 'assistant'
            - content: texto da mensagem (pergunta ou insight)
            - sql: SQL gerado (apenas para role='assistant', None para 'user')

        O backend pode serializar com json.dumps() e armazenar onde desejar.
        """
        return [entry.copy() for entry in self._history]

    def import_history(self, history: list[dict[str, str | None]]) -> None:
        """
        Restaura o histórico a partir de um snapshot exportado.

        Valida o formato de cada entrada e aplica truncamento
        automático a MAX_HISTORY_TURNS turnos.

        Args:
            history: Lista de dicts no formato retornado por export_history().

        Raises:
            ValueError: Se o formato do histórico for inválido.
        """
        if not isinstance(history, list):
            raise ValueError("O histórico deve ser uma lista de dicionários.")

        valid_roles = {"user", "assistant"}
        normalized_history: list[dict[str, str | None]] = []
        for index, entry in enumerate(history):
            if not isinstance(entry, dict):
                raise ValueError(
                    "Cada entrada do histórico deve ser um dicionário."
                )
            role = entry.get("role")
            if role not in valid_roles:
                raise ValueError(
                    f"Campo 'role' inválido: '{role}'. "
                    f"Valores permitidos: {valid_roles}"
                )
            expected_role = "user" if index % 2 == 0 else "assistant"
            if role != expected_role:
                raise ValueError(
                    "O histórico deve alternar pares user/assistant."
                )
            content = entry.get("content")
            if not isinstance(content, str) or not content.strip():
                raise ValueError(
                    "Cada entrada deve ter um campo 'content' com texto não vazio."
                )
            sql = entry.get("sql")
            if role == "user":
                if sql is not None:
                    raise ValueError(
                        "Entradas com role='user' devem ter campo 'sql' nulo ou ausente."
                    )
                normalized_history.append({
                    "role": "user",
                    "content": content,
                    "sql": None,
                })
                continue

            if not isinstance(sql, str) or not sql.strip():
                raise ValueError(
                    "Entradas com role='assistant' devem ter campo 'sql' com texto não vazio."
                )
            normalized_history.append({
                "role": "assistant",
                "content": content,
                "sql": sql,
            })

        if len(normalized_history) % 2 != 0:
            raise ValueError(
                "O histórico deve conter pares completos user/assistant."
            )

        max_entries = config.MAX_HISTORY_TURNS * 2
        self._history = [
            entry.copy() for entry in normalized_history[-max_entries:]
        ]

    def _append_to_history(
        self, question: str, response: "AgentResponse"
    ) -> None:
        """Adiciona a interação ao histórico e aplica truncamento."""
        self._history.append(
            {"role": "user", "content": question, "sql": None}
        )
        self._history.append({
            "role": "assistant",
            "content": response.user_response.answer_text,
            "sql": response.developer_debug.sql,
        })
        max_entries = config.MAX_HISTORY_TURNS * 2
        if len(self._history) > max_entries:
            self._history = self._history[-max_entries:]

    async def _load_schema(self) -> tuple[str, dict[str, Any]]:
        """Carrega e formata o schema do banco (lazy caching)."""
        if self._schema_text is not None and self._technical_schema is not None:
            return self._schema_text, self._technical_schema

        descriptions = load_descriptions(self._schema_descriptions_path)
        technical_schema = await self._db.get_technical_schema()
        self._descriptions = descriptions
        self._technical_schema = technical_schema
        self._schema_text = format_schema(
            technical_schema, descriptions, excluded_tables=self._excluded_tables
        )
        return self._schema_text, self._technical_schema

    def _make_error_response(
        self,
        *,
        code: str | ErrorCode,
        stage: Literal[
            "input",
            "schema",
            "sql_generation",
            "sql_validation",
            "database",
            "insight_generation",
            "llm",
        ],
        sql: str = "",
        message: str | None = None,
        retryable: bool = False,
        total_time_ms: float | None = None,
        sql_generation_time_ms: float | None = None,
        query_execution_time_ms: float | None = None,
        insight_generation_time_ms: float | None = None,
        tokens_used: int | None = None,
    ) -> AgentResponse:
        """Monta uma resposta de erro padronizada para o backend."""
        error = ResponseError(
            code=_error_code_value(code),
            message=message or self._GENERIC_ERROR_MSG,
            stage=stage,
            retryable=retryable,
        )
        return AgentResponse(
            status="error",
            user_response=UserResponse(
                answer_text=self._GENERIC_ERROR_MSG,
                sources_text=None,
                data=None,
                chart=None,
                truncated=False,
            ),
            developer_debug=DeveloperDebug(
                sql=sql,
                error=error,
                total_time_ms=total_time_ms,
                sql_generation_time_ms=sql_generation_time_ms,
                query_execution_time_ms=query_execution_time_ms,
                insight_generation_time_ms=insight_generation_time_ms,
                tokens_used=tokens_used,
            ),
        )

    def _make_llm_error_response(
        self,
        exc: LLMError,
        *,
        sql: str = "",
        total_time_ms: float | None = None,
        sql_generation_time_ms: float | None = None,
        query_execution_time_ms: float | None = None,
        insight_generation_time_ms: float | None = None,
        tokens_used: int | None = None,
    ) -> AgentResponse:
        """Converte falhas esperadas do LLM em erro estruturado."""
        code = ErrorCode.LLM_UNKNOWN_ERROR
        retryable = isinstance(
            exc, (LLMRateLimitError, LLMTimeoutError, LLMUnavailableError)
        )
        if isinstance(exc, LLMAuthenticationError):
            code = ErrorCode.LLM_AUTHENTICATION_ERROR
            retryable = False
        elif isinstance(exc, LLMQuotaError):
            code = ErrorCode.LLM_QUOTA_ERROR
            retryable = False
        elif isinstance(exc, LLMRateLimitError):
            code = ErrorCode.LLM_RATE_LIMIT_ERROR
            retryable = True
        elif isinstance(exc, LLMTimeoutError):
            code = ErrorCode.LLM_TIMEOUT_ERROR
            retryable = True
        elif isinstance(exc, LLMUnavailableError):
            code = ErrorCode.LLM_UNAVAILABLE_ERROR
            retryable = True
        elif isinstance(exc, LLMInvalidRequestError):
            code = ErrorCode.LLM_INVALID_REQUEST_ERROR
            retryable = False
        elif isinstance(exc, LLMInternalError):
            code = ErrorCode.LLM_INTERNAL_ERROR
            retryable = True
        elif isinstance(exc, LLMUnknownError):
            code = ErrorCode.LLM_UNKNOWN_ERROR
            retryable = False
        return self._make_error_response(
            code=code,
            stage="llm",
            sql=sql,
            message=str(exc) or self._GENERIC_ERROR_MSG,
            retryable=retryable,
            total_time_ms=total_time_ms,
            sql_generation_time_ms=sql_generation_time_ms,
            query_execution_time_ms=query_execution_time_ms,
            insight_generation_time_ms=insight_generation_time_ms,
            tokens_used=tokens_used,
        )

    def _extract_sources(self, sql: str) -> list[_DataSource]:
        """Extrai tabelas do SQL validado e expõe aliases seguros de negócio."""
        try:
            tree = parse_one(sql, read="sqlite")
        except Exception:
            return []

        cte_names = {cte.alias for cte in tree.find_all(exp.CTE)}
        schema_tables = set((self._technical_schema or {}).get("tables", {}))
        seen_tables: set[str] = set()
        table_names: list[str] = []
        for table in tree.find_all(exp.Table):
            table_name = table.name
            if (
                not table_name
                or table_name in cte_names
                or table_name not in schema_tables
                or table_name in self._excluded_tables
                or table_name in seen_tables
            ):
                continue
            seen_tables.add(table_name)
            table_names.append(table_name)

        tables_meta = (self._descriptions or {}).get("tables", {})
        sources: list[_DataSource] = []
        for table_name in table_names:
            meta = tables_meta.get(table_name, {})
            display_name = str(
                meta.get("display_name") or table_name
            )
            display_name = _format_source_label(display_name)
            sources.append(
                _DataSource(
                    table=display_name,
                    label=display_name,
                )
            )
        return sources

    def _sanitize_display_text(self, text: str) -> str:
        """Substitui nomes físicos de tabelas por aliases de negócio."""
        tables_meta = (self._descriptions or {}).get("tables", {})
        sanitized = text
        for table_name, meta in sorted(
            tables_meta.items(), key=lambda item: len(item[0]), reverse=True
        ):
            display_name = str(
                meta.get("display_name") or table_name
            )
            display_name = _format_source_label(display_name)
            sanitized = sanitized.replace(table_name, display_name)
        return sanitized

    def _extract_filter_summary(self, sql: str) -> list[str]:
        """Extrai filtros simples do SQL para compor o texto de fontes."""
        filters: list[str] = []
        lower_sql = sql.lower()

        years = re.findall(r"\bano\b\s*=\s*(\d{4})", lower_sql)
        for year in years:
            filters.append(f"ano {year}")

        statuses = re.findall(r"\bstatus\b\s*=\s*'([^']+)'", sql, flags=re.IGNORECASE)
        for status in statuses:
            normalized_status = status.strip()
            if normalized_status.lower() == "entregue":
                filters.append("pedidos entregues")
            elif normalized_status:
                filters.append(f"status {normalized_status}")

        return list(dict.fromkeys(filters))

    def _extract_metric_summary(self, data: list[dict] | None) -> list[str]:
        """Extrai nomes de métricas exibidas a partir das colunas de dados."""
        if not data:
            return []

        dimension_names = {
            "produto",
            "categoria",
            "cliente",
            "regiao",
            "região",
            "status",
            "data",
            "mes",
            "mês",
            "ano",
            "trimestre",
        }
        metrics: list[str] = []
        for key, value in data[0].items():
            label = str(key).replace("_", " ").strip().lower()
            if not label or label in dimension_names:
                continue
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                continue
            metrics.append(label)
        return metrics

    def _build_sources_explanation(
        self,
        sources: list[_DataSource],
        sql: str,
        data: list[dict] | None,
        fallback_text: str = "",
    ) -> str:
        """Gera texto curto de origem das fontes no estilo exibido pela UI."""
        if fallback_text:
            sanitized = self._sanitize_display_text(fallback_text).strip()
            lower = sanitized.lower()
            if sanitized and len(sanitized) <= _MAX_SOURCES_TEXT_CHARS and (
                "cruzamento" in lower
                or "consulta da base" in lower
                or "listagem de" in lower
            ):
                return _limit_sources_text(sanitized)

        if not sources:
            return ""

        source_names = [source.table for source in sources]
        if len(source_names) == 1:
            source_phrase = f"Consulta da base de {source_names[0]}"
        elif len(source_names) == 2:
            source_phrase = (
                f"Cruzamento da base de {source_names[0]} com {source_names[1]}"
            )
        else:
            source_phrase = (
                f"Cruzamento da base de {source_names[0]} com "
                + ", ".join(source_names[1:-1])
                + f" e {source_names[-1]}"
            )

        filters = self._extract_filter_summary(sql)
        metrics = self._extract_metric_summary(data)
        filter_text = f" (filtros: {', '.join(filters)})" if filters else ""
        metric_text = ""
        if metrics:
            metric_term = (
                "principal métrica"
                if len(metrics) == 1
                else "principais métricas"
            )
            metric_text = (
                ", usando "
                + ", ".join(metrics[:-1])
                + (" e " if len(metrics) > 1 else "")
                + metrics[-1]
                + f" como {metric_term} da consulta"
            )

        return _limit_sources_text(
            "Fonte de dados consultada: "
            f"{source_phrase}{filter_text}{metric_text}."
        )

    def _build_sources_summary(
        self, insight: dict[str, Any], sql: str, data: list[dict] | None = None
    ) -> _SourcesSummary | None:
        """Combina resumo textual do LLM com fontes extraídas do SQL."""
        sources = self._extract_sources(sql)
        raw_summary = insight.get("sources_summary")
        text = ""
        if isinstance(raw_summary, dict) and isinstance(raw_summary.get("text"), str):
            text = self._sanitize_display_text(raw_summary["text"].strip())
        if sources:
            text = self._build_sources_explanation(
                sources, sql=sql, data=data, fallback_text=text
            )
        if not text and not sources:
            return None
        return _SourcesSummary(text=text, tables=sources)

    def _build_presentation(
        self, insight: dict[str, Any], sql: str, data: list[dict] | None = None
    ) -> _ResponsePresentation:
        """Converte o JSON da Chamada 2 para uma estrutura textual interna."""
        sections = [
            _ResponseSection(
                title=self._sanitize_display_text(str(section["title"])),
                content=self._sanitize_display_text(str(section["content"])),
            )
            for section in insight["answer_sections"]
        ]
        return _ResponsePresentation(
            activity=self._sanitize_display_text(str(insight["activity"])),
            answer_sections=sections,
            sources_summary=self._build_sources_summary(insight, sql, data=data),
        )

    def _build_chart(
        self, chart_data: Any, data: list[dict[str, Any]]
    ) -> ChartSuggestion | None:
        """Valida e converte a sugestão de gráfico da Chamada 2."""
        if not isinstance(chart_data, dict) or not data:
            return None

        chart_type = chart_data.get("type")
        if chart_type not in {"bar", "line", "pie", "area"}:
            return None

        sample_keys = set(data[0].keys())
        x_axis = chart_data.get("x_axis")
        y_axis = chart_data.get("y_axis")
        if x_axis is not None and x_axis not in sample_keys:
            return None
        if y_axis is not None and y_axis not in sample_keys:
            return None

        return ChartSuggestion(
            type=chart_type,
            x_axis=x_axis,
            y_axis=y_axis,
            title=str(chart_data.get("title") or ""),
        )

    async def ask(self, question: str) -> AgentResponse:
        """
        Processa uma pergunta em linguagem natural e retorna uma resposta estruturada.

        Fluxo:
            1. Carrega o schema do banco.
            2. Gera SQL (Chamada 1).
            3. Detecta perguntas fora do escopo.
            4. Executa o SQL no banco.
            5. Gera insight (Chamada 2).
            6. Monta e retorna AgentResponse.

        Args:
            question: Pergunta do usuário em português brasileiro.

        Returns:
            AgentResponse com payload de usuário e debug técnico separados.

        Observação:
            Falhas esperadas do pipeline são retornadas em
            `AgentResponse.developer_debug.error`.
            Exceções de programação fora do contrato público continuam propagando.
        """
        total_start = time.perf_counter()
        sql = ""
        sql_generation_time_ms: float | None = None
        query_execution_time_ms: float | None = None
        insight_generation_time_ms: float | None = None
        tokens_used: int | None = None

        def _elapsed_ms(start: float) -> float:
            return round((time.perf_counter() - start) * 1000, 2)

        def _build_debug(
            sql_str: str, error: ResponseError | None = None
        ) -> DeveloperDebug:
            return DeveloperDebug(
                sql=sql_str,
                error=error,
                total_time_ms=_elapsed_ms(total_start),
                sql_generation_time_ms=sql_generation_time_ms,
                query_execution_time_ms=query_execution_time_ms,
                insight_generation_time_ms=insight_generation_time_ms,
                tokens_used=tokens_used,
            )

        def _make_out_of_scope_response(marker_text: str) -> AgentResponse:
            """Monta resposta fora de escopo sem expor marcador técnico."""
            return AgentResponse(
                status="out_of_scope",
                user_response=UserResponse(
                    answer_text=_strip_out_of_scope_marker(marker_text),
                    sources_text=None,
                    data=None,
                    chart=None,
                    truncated=False,
                ),
                developer_debug=_build_debug(""),
            )

        def _log_ask_finished(status: str, error_code: str | None = None) -> None:
            logger.info(
                "ask_finished",
                extra={
                    "event": "ask_finished",
                    "status": status,
                    "total_time_ms": _elapsed_ms(total_start),
                    "tokens_used": tokens_used,
                    "error_code": error_code,
                },
            )

        # Camada 0: validação do tipo do input (contrato público)
        if not isinstance(question, str):
            _log_ask_finished("error", _error_code_value(ErrorCode.INVALID_INPUT_TYPE))
            return self._make_error_response(
                code=ErrorCode.INVALID_INPUT_TYPE,
                stage="input",
                message=f"Esperado str, recebido {type(question).__name__}.",
                retryable=False,
                total_time_ms=_elapsed_ms(total_start),
            )

        logger.info(
            "ask_started",
            extra={"event": "ask_started", "model": self._llm_model},
        )

        # Camada 1: validação do input do usuário (pré-LLM)
        try:
            validate_empty_input(question)
            validate_input_length(question)
            validate_prompt_injection(question)
        except GuardrailError as exc:
            code = _error_code_value(exc.error_code)
            if code == ErrorCode.PROMPT_INJECTION:
                logger.warning(
                    "prompt_injection_detected",
                    extra={"event": "prompt_injection_detected", "error_code": code},
                )
            _log_ask_finished("error", code)
            return self._make_error_response(
                code=exc.error_code,
                stage="input",
                message=str(exc),
                retryable=False,
                total_time_ms=_elapsed_ms(total_start),
            )

        if _is_hidden_table_scope_request(question):
            _log_ask_finished("out_of_scope")
            return _make_out_of_scope_response(
                f"{config.OUT_OF_SCOPE_MARKER} "
                "Não posso consultar tabelas ocultas, internas ou não listadas "
                "no schema disponível."
            )

        # Etapa 1: carregar schema
        schema_load_start = time.perf_counter()
        try:
            schema, technical_schema = await self._load_schema()
            self._technical_schema = technical_schema
        except (FileNotFoundError, RuntimeError, ValueError) as exc:
            _log_ask_finished("error", _error_code_value(ErrorCode.SCHEMA_LOAD_ERROR))
            return self._make_error_response(
                code=ErrorCode.SCHEMA_LOAD_ERROR,
                stage="schema",
                message=str(exc),
                retryable=False,
                total_time_ms=_elapsed_ms(total_start),
            )

        logger.info(
            "schema_loaded",
            extra={
                "event": "schema_loaded",
                "elapsed_ms": _elapsed_ms(schema_load_start),
            },
        )

        # Etapa 2: gerar SQL
        sql_start = time.perf_counter()
        try:
            sql, sql_tokens = await generate_sql(
                question, schema, history=self._history, model=self._llm_model
            )
            if sql_tokens is not None:
                tokens_used = (tokens_used or 0) + sql_tokens
        except (ValueError, LLMParseError) as exc:
            sql_generation_time_ms = _elapsed_ms(sql_start)
            _log_ask_finished("error", _error_code_value(ErrorCode.SQL_PARSE_ERROR))
            return self._make_error_response(
                code=ErrorCode.SQL_PARSE_ERROR,
                stage="sql_generation",
                sql=sql,
                message=str(exc),
                retryable=True,
                total_time_ms=_elapsed_ms(total_start),
                sql_generation_time_ms=sql_generation_time_ms,
                tokens_used=tokens_used,
            )
        except (LLMError, EnvironmentError) as exc:
            sql_generation_time_ms = _elapsed_ms(sql_start)
            if isinstance(exc, EnvironmentError):
                exc = LLMAuthenticationError(str(exc))
            _log_ask_finished("error", _error_code_value(getattr(exc, 'error_code', ErrorCode.LLM_UNKNOWN_ERROR)))
            return self._make_llm_error_response(
                exc,
                sql=sql,
                total_time_ms=_elapsed_ms(total_start),
                sql_generation_time_ms=sql_generation_time_ms,
                tokens_used=tokens_used,
            )
        sql_generation_time_ms = _elapsed_ms(sql_start)

        logger.info(
            "sql_generated",
            extra={
                "event": "sql_generated",
                "elapsed_ms": sql_generation_time_ms,
                "tokens_used": tokens_used,
                "model": self._llm_model,
            },
        )

        # Etapa 2.5: detectar fora do escopo antes da Camada 2
        # O marcador nao e SQL valido; aplicar guardrails causaria erro de parse
        if sql.strip().upper().startswith(config.OUT_OF_SCOPE_MARKER):
            _log_ask_finished("out_of_scope")
            return _make_out_of_scope_response(sql)

        # Etapa 3: aplicar Camada 2 com loop de autocorreção
        allowlist = build_allowlist(
            technical_schema, excluded_tables=self._excluded_tables
        )
        for attempt in range(self._MAX_LAYER2_RETRIES):
            try:
                sql = apply_layer_2(sql, allowlist, self._max_rows)
                break
            except GuardrailError as exc:
                if attempt == self._MAX_LAYER2_RETRIES - 1:
                    logger.warning(
                        "layer_2_blocked",
                        extra={
                            "event": "layer_2_blocked",
                            "error_code": _error_code_value(exc.error_code),
                            "stage": "sql_validation",
                            "attempt": attempt + 1,
                            "sql": sql,
                        },
                    )
                    _log_ask_finished("error", _error_code_value(exc.error_code))
                    return self._make_error_response(
                        code=exc.error_code,
                        stage="sql_validation",
                        sql=sql,
                        message=str(exc),
                        retryable=False,
                        total_time_ms=_elapsed_ms(total_start),
                        sql_generation_time_ms=sql_generation_time_ms,
                        tokens_used=tokens_used,
                    )
                logger.info(
                    "sql_correction_attempted",
                    extra={"event": "sql_correction_attempted", "attempt": attempt + 1},
                )
                correction_start = time.perf_counter()
                try:
                    sql, correction_tokens = await generate_sql_correction(
                        question=question,
                        sql=sql,
                        error=str(exc),
                        schema=schema,
                        history=self._history,
                        model=self._llm_model,
                    )
                    if correction_tokens is not None:
                        tokens_used = (tokens_used or 0) + correction_tokens
                except (ValueError, LLMParseError) as exc:
                    sql_generation_time_ms = (
                        (sql_generation_time_ms or 0.0)
                        + _elapsed_ms(correction_start)
                    )
                    _log_ask_finished("error", _error_code_value(ErrorCode.SQL_PARSE_ERROR))
                    return self._make_error_response(
                        code=ErrorCode.SQL_PARSE_ERROR,
                        stage="sql_generation",
                        sql=sql,
                        message=str(exc),
                        retryable=True,
                        total_time_ms=_elapsed_ms(total_start),
                        sql_generation_time_ms=sql_generation_time_ms,
                        tokens_used=tokens_used,
                    )
                except LLMError as exc:
                    sql_generation_time_ms = (
                        (sql_generation_time_ms or 0.0)
                        + _elapsed_ms(correction_start)
                    )
                    _log_ask_finished("error", _error_code_value(getattr(exc, 'error_code', ErrorCode.LLM_UNKNOWN_ERROR)))
                    return self._make_llm_error_response(
                        exc,
                        sql=sql,
                        total_time_ms=_elapsed_ms(total_start),
                        sql_generation_time_ms=sql_generation_time_ms,
                        tokens_used=tokens_used,
                    )
                sql_generation_time_ms = (
                    (sql_generation_time_ms or 0.0)
                    + _elapsed_ms(correction_start)
                )
                if sql.strip().upper().startswith(config.OUT_OF_SCOPE_MARKER):
                    _log_ask_finished("out_of_scope")
                    return _make_out_of_scope_response(sql)
                await asyncio.sleep(1 * (2 ** attempt))

        # Etapa 4: executar SQL
        query_start = time.perf_counter()
        try:
            rows, truncated = await self._db.execute_query(sql)
        except (RuntimeError, TimeoutError) as exc:
            query_execution_time_ms = _elapsed_ms(query_start)
            err_code = (
                ErrorCode.EXECUTION_TIMEOUT
                if isinstance(exc, TimeoutError)
                else ErrorCode.DB_EXECUTION_ERROR
            )
            _log_ask_finished("error", _error_code_value(err_code))
            return self._make_error_response(
                code=err_code,
                stage="database",
                sql=sql,
                message=str(exc),
                retryable=isinstance(exc, TimeoutError),
                total_time_ms=_elapsed_ms(total_start),
                sql_generation_time_ms=sql_generation_time_ms,
                query_execution_time_ms=query_execution_time_ms,
                tokens_used=tokens_used,
            )
        query_execution_time_ms = _elapsed_ms(query_start)
        logger.info(
            "query_executed",
            extra={
                "event": "query_executed",
                "elapsed_ms": query_execution_time_ms,
                "rows_count": len(rows),
                "truncated": truncated,
            },
        )

        # Etapa 4.5: mascarar dados sensíveis antes da Chamada 2
        try:
            masking_result = mask_sensitive_data(
                rows,
                sql=sql,
                descriptions=self._descriptions or {},
                technical_schema=self._technical_schema,
            )
        except GuardrailError as exc:
            _log_ask_finished("error", _error_code_value(exc.error_code))
            return self._make_error_response(
                code=exc.error_code,
                stage="sql_validation",
                sql=sql,
                message=str(exc),
                retryable=False,
                total_time_ms=_elapsed_ms(total_start),
                sql_generation_time_ms=sql_generation_time_ms,
                query_execution_time_ms=query_execution_time_ms,
                tokens_used=tokens_used,
            )

        # Etapa 5: gerar insight (com dados mascarados)
        insight_start = time.perf_counter()
        try:
            insight, insight_tokens = await generate_insight(
                question,
                masking_result.llm_data,
                sql,
                history=self._history,
                model=self._llm_model,
            )
            if insight_tokens is not None:
                tokens_used = (tokens_used or 0) + insight_tokens
        except LLMParseError as exc:
            insight_generation_time_ms = _elapsed_ms(insight_start)
            _log_ask_finished("error", _error_code_value(ErrorCode.INSIGHT_PARSE_ERROR))
            return self._make_error_response(
                code=ErrorCode.INSIGHT_PARSE_ERROR,
                stage="insight_generation",
                sql=sql,
                message=str(exc),
                retryable=True,
                total_time_ms=_elapsed_ms(total_start),
                sql_generation_time_ms=sql_generation_time_ms,
                query_execution_time_ms=query_execution_time_ms,
                insight_generation_time_ms=insight_generation_time_ms,
                tokens_used=tokens_used,
            )
        except (LLMError, EnvironmentError) as exc:
            insight_generation_time_ms = _elapsed_ms(insight_start)
            if isinstance(exc, EnvironmentError):
                exc = LLMAuthenticationError(str(exc))
            _log_ask_finished("error", _error_code_value(getattr(exc, 'error_code', ErrorCode.LLM_UNKNOWN_ERROR)))
            return self._make_llm_error_response(
                exc,
                sql=sql,
                total_time_ms=_elapsed_ms(total_start),
                sql_generation_time_ms=sql_generation_time_ms,
                query_execution_time_ms=query_execution_time_ms,
                insight_generation_time_ms=insight_generation_time_ms,
                tokens_used=tokens_used,
            )
        insight_generation_time_ms = _elapsed_ms(insight_start)

        logger.info(
            "insight_generated",
            extra={
                "event": "insight_generated",
                "elapsed_ms": insight_generation_time_ms,
                "tokens_used": tokens_used,
                "model": self._llm_model,
            },
        )

        # Etapa 6: montar resposta (restaurando tokens nos textos exibíveis)
        presentation = self._build_presentation(insight, sql, data=rows)

        # Restaura tokens nos campos textuais produzidos pelo LLM
        token_map = masking_result.token_to_value
        if token_map:
            presentation.activity = restore_sensitive_values(
                presentation.activity, token_map
            )
            presentation.answer_sections = [
                _ResponseSection(
                    title=restore_sensitive_values(section.title, token_map),
                    content=restore_sensitive_values(section.content, token_map),
                )
                for section in presentation.answer_sections
            ]
            if presentation.sources_summary is not None:
                presentation.sources_summary = _SourcesSummary(
                    text=restore_sensitive_values(
                        presentation.sources_summary.text, token_map
                    ),
                    tables=presentation.sources_summary.tables,
                )

        answer_text = _build_answer_text_from_presentation(presentation)
        sources_text = (
            presentation.sources_summary.text
            if presentation.sources_summary is not None
            else None
        )

        # Monta chart validando contra chaves reais de rows
        chart_data = insight.get("chart")
        chart = self._build_chart(chart_data, rows)
        if chart is not None and token_map:
            chart = ChartSuggestion(
                type=chart.type,
                x_axis=chart.x_axis,
                y_axis=chart.y_axis,
                title=restore_sensitive_values(chart.title, token_map),
            )

        response = AgentResponse(
            status="success",
            user_response=UserResponse(
                answer_text=answer_text,
                sources_text=sources_text,
                data=rows,
                chart=chart,
                truncated=truncated,
            ),
            developer_debug=_build_debug(sql),
        )

        _log_ask_finished("success")

        # Armazena no histórico apenas interações bem-sucedidas
        self._append_to_history(question, response)

        return response

    async def initial_suggestions(
        self, history: list[dict[str, str | None]] | None = None
    ) -> list[str]:
        """
        Retorna 5 sugestões de perguntas para o chat.

        Quando o histórico está vazio ou ausente, retorna uma lista fixa
        e imutável de perguntas iniciais sem chamar o LLM.

        Quando o histórico está preenchido, gera 5 perguntas contextuais
        via LLM com base no schema real e no estado da conversa.
        Em caso de falha esperada, retorna a lista fixa.

        Args:
            history: Histórico da conversa no formato exportado pelo agente.
                Se vazio ou None, retorna a lista fixa sem chamar o LLM.

        Returns:
            Lista com exatamente 5 perguntas em português brasileiro.
        """
        if not history:
            logger.info(
                "suggestions_finished",
                extra={"event": "suggestions_finished", "status": "initial"},
            )
            return list(INITIAL_SUGGESTIONS)

        logger.info(
            "suggestions_started",
            extra={"event": "suggestions_started", "model": self._llm_model},
        )
        try:
            schema, _ = await self._load_schema()
            suggestions, tokens = await generate_suggestions(
                schema,
                history=history,
                model=self._llm_model,
            )
            logger.info(
                "suggestions_generated",
                extra={
                    "event": "suggestions_generated",
                    "tokens_used": tokens,
                    "model": self._llm_model,
                },
            )
            logger.info(
                "suggestions_finished",
                extra={"event": "suggestions_finished", "status": "success"},
            )
            return suggestions
        except (OSError, RuntimeError, ValueError, LLMError):
            logger.info(
                "suggestions_fallback",
                extra={"event": "suggestions_fallback"},
            )
            logger.info(
                "suggestions_finished",
                extra={"event": "suggestions_finished", "status": "fallback"},
            )
            return list(INITIAL_SUGGESTIONS)
