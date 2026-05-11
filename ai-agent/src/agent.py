"""
Classe pública do agente de IA.

Orquestra as duas chamadas ao LLM (geração de SQL e geração de insight)
e expõe a interface consumida pelo backend FastAPI.
"""

import asyncio
from dataclasses import dataclass
from typing import Any, Literal

from sqlglot import exp, parse_one

from src.core import config
from src.database.db import Database
from src.core.exceptions import (
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
from src.security.guardrails import (
    apply_layer_2,
    validate_empty_input,
    validate_input_length,
    validate_prompt_injection,
)
from src.llm.insight_generator import generate_insight
from src.database.schema import build_allowlist, format_schema, load_descriptions
from src.llm.sql_generator import generate_sql, generate_sql_correction


@dataclass
class ChartSuggestion:
    """Sugestão de visualização gráfica para o frontend."""

    type: Literal["bar", "line", "pie", "area"]
    x_axis: str | None
    y_axis: str | None
    title: str


@dataclass
class ResponseSection:
    """Seção textual da resposta apresentada ao usuário."""

    title: str
    content: str


@dataclass
class DataSource:
    """Tabela consultada para compor a resposta."""

    table: str
    label: str | None
    description: str | None


@dataclass
class SourcesSummary:
    """Resumo das fontes de dados usadas na resposta."""

    text: str
    tables: list[DataSource]


@dataclass
class ResponsePresentation:
    """Estrutura textual alinhada ao layout do frontend."""

    activity: str
    answer_sections: list[ResponseSection]
    sources_summary: SourcesSummary | None


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
class AgentResponse:
    """Resposta completa do agente para uma pergunta do usuário."""

    status: Literal["success", "error", "out_of_scope"]
    text: str
    presentation: ResponsePresentation | None
    data: list[dict] | None
    chart: ChartSuggestion | None
    sql: str
    error: ResponseError | None
    out_of_scope: bool
    truncated: bool = False


def _error_code_value(code: str | ErrorCode) -> str:
    """Normaliza códigos internos para string serializável."""
    return code.value if isinstance(code, ErrorCode) else str(code)


def _build_text_from_presentation(presentation: ResponsePresentation | None) -> str:
    """Monta o campo legado `text` a partir da apresentação estruturada."""
    if presentation is None:
        return ""

    parts = [presentation.activity.strip()]
    for section in presentation.answer_sections:
        parts.append(f"{section.title}: {section.content}")
    if presentation.sources_summary is not None:
        parts.append(presentation.sources_summary.text)
    return "\n\n".join(part for part in parts if part)


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
        """
        self._db = Database(
            db_path,
            max_rows=max_rows,
            query_timeout_seconds=query_timeout_seconds,
        )
        self._max_rows = max_rows
        self._excluded_tables: set[str] = excluded_tables or set()
        self._llm_model = llm_model
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
            "content": response.text,
            "sql": response.sql,
        })
        # Truncar ao limite
        max_entries = config.MAX_HISTORY_TURNS * 2
        if len(self._history) > max_entries:
            self._history = self._history[-max_entries:]

    async def _load_schema(self) -> tuple[str, dict[str, Any]]:
        """Carrega e formata o schema do banco (lazy caching)."""
        if self._schema_text is not None and self._technical_schema is not None:
            return self._schema_text, self._technical_schema

        descriptions = load_descriptions()
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
            text=error.message,
            presentation=None,
            data=None,
            chart=None,
            sql=sql,
            error=error,
            out_of_scope=False,
            truncated=False,
        )

    def _make_llm_error_response(self, exc: LLMError, *, sql: str = "") -> AgentResponse:
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
        )

    def _extract_sources(self, sql: str) -> list[DataSource]:
        """Extrai tabelas do SQL validado e enriquece com metadados de negócio."""
        try:
            tree = parse_one(sql, read="sqlite")
        except Exception:
            return []

        table_names = sorted(
            {
                table.name
                for table in tree.find_all(exp.Table)
                if table.name
                and table.name in set((self._technical_schema or {}).get("tables", {}))
                and table.name not in self._excluded_tables
            }
        )
        tables_meta = (self._descriptions or {}).get("tables", {})
        sources: list[DataSource] = []
        for table_name in table_names:
            meta = tables_meta.get(table_name, {})
            sources.append(
                DataSource(
                    table=table_name,
                    label=table_name,
                    description=meta.get("description"),
                )
            )
        return sources

    def _build_sources_summary(
        self, insight: dict[str, Any], sql: str
    ) -> SourcesSummary | None:
        """Combina resumo textual do LLM com fontes extraídas do SQL."""
        sources = self._extract_sources(sql)
        raw_summary = insight.get("sources_summary")
        text = ""
        if isinstance(raw_summary, dict) and isinstance(raw_summary.get("text"), str):
            text = raw_summary["text"].strip()
        if not text and sources:
            names = ", ".join(source.table for source in sources)
            text = f"Fonte de dados consultada: {names}."
        if not text and not sources:
            return None
        return SourcesSummary(text=text, tables=sources)

    def _build_presentation(
        self, insight: dict[str, Any], sql: str
    ) -> ResponsePresentation:
        """Converte o JSON da Chamada 2 para dataclasses públicas."""
        sections = [
            ResponseSection(
                title=str(section["title"]),
                content=str(section["content"]),
            )
            for section in insight["answer_sections"]
        ]
        return ResponsePresentation(
            activity=str(insight["activity"]),
            answer_sections=sections,
            sources_summary=self._build_sources_summary(insight, sql),
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
            AgentResponse contendo insight, dados brutos, sugestão de gráfico e SQL.

        Observação:
            Falhas esperadas do pipeline são retornadas em `AgentResponse.error`.
            Exceções de programação fora do contrato público continuam propagando.
        """
        sql = ""

        # Camada 1: validação do input do usuário (pré-LLM)
        try:
            validate_empty_input(question)
            validate_input_length(question)
            validate_prompt_injection(question)
        except GuardrailError as exc:
            return self._make_error_response(
                code=exc.error_code,
                stage="input",
                retryable=False,
            )

        # Etapa 1: carregar schema
        try:
            schema, technical_schema = await self._load_schema()
            self._technical_schema = technical_schema
        except (FileNotFoundError, RuntimeError, ValueError):
            return self._make_error_response(
                code=ErrorCode.SCHEMA_LOAD_ERROR,
                stage="schema",
                retryable=False,
            )

        # Etapa 2: gerar SQL
        try:
            sql = await generate_sql(
                question, schema, history=self._history, model=self._llm_model
            )
        except (ValueError, LLMParseError):
            return self._make_error_response(
                code=ErrorCode.SQL_PARSE_ERROR,
                stage="sql_generation",
                sql=sql,
                retryable=True,
            )
        except LLMError as exc:
            return self._make_llm_error_response(exc, sql=sql)

        # Etapa 2.5: detectar fora do escopo antes da Camada 2
        # O marcador nao e SQL valido; aplicar guardrails causaria erro de parse
        if sql.strip().upper().startswith(config.OUT_OF_SCOPE_MARKER):
            return AgentResponse(
                status="out_of_scope",
                text=sql,
                presentation=None,
                data=None,
                chart=None,
                sql="",
                error=None,
                out_of_scope=True,
                truncated=False,
            )

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
                    return self._make_error_response(
                        code=exc.error_code,
                        stage="sql_validation",
                        sql=sql,
                        retryable=False,
                    )
                try:
                    sql = await generate_sql_correction(
                        question=question,
                        sql=sql,
                        error=str(exc),
                        schema=schema,
                        history=self._history,
                        model=self._llm_model,
                    )
                except (ValueError, LLMParseError):
                    return self._make_error_response(
                        code=ErrorCode.SQL_PARSE_ERROR,
                        stage="sql_generation",
                        sql=sql,
                        retryable=True,
                    )
                except LLMError as exc:
                    return self._make_llm_error_response(exc, sql=sql)
                await asyncio.sleep(1 * (2 ** attempt))

        # Etapa 4: executar SQL
        try:
            rows, truncated = await self._db.execute_query(sql)
        except (RuntimeError, TimeoutError) as exc:
            err_code = ErrorCode.EXECUTION_TIMEOUT if isinstance(exc, TimeoutError) else ErrorCode.DB_EXECUTION_ERROR
            return self._make_error_response(
                code=err_code,
                stage="database",
                sql=sql,
                retryable=isinstance(exc, TimeoutError),
            )

        # Etapa 5: gerar insight
        try:
            insight = await generate_insight(
                question, rows, sql, history=self._history, model=self._llm_model
            )
        except LLMParseError:
            return self._make_error_response(
                code=ErrorCode.INSIGHT_PARSE_ERROR,
                stage="insight_generation",
                sql=sql,
                retryable=True,
            )
        except LLMError as exc:
            return self._make_llm_error_response(exc, sql=sql)

        # Etapa 6: montar resposta
        presentation = self._build_presentation(insight, sql)
        chart = self._build_chart(insight.get("chart"), rows)

        response = AgentResponse(
            status="success",
            text=_build_text_from_presentation(presentation),
            presentation=presentation,
            data=rows,
            chart=chart,
            sql=sql,
            error=None,
            out_of_scope=False,
            truncated=truncated,
        )

        # Armazena no histórico apenas interações bem-sucedidas
        self._append_to_history(question, response)

        return response

    def initial_suggestions(self) -> list[str]:
        """
        Retorna uma lista fixa de sugestões iniciais de perguntas baseadas no schema real do banco.
        
        O backend pode selecionar um subconjunto aleatório destas 20 perguntas para exibir no frontend.
        Abrange domínios de Vendas, Produtos, Clientes, Suporte, Avaliações e Navegação.
        """
        return [
            "Quais foram os 10 produtos com maior receita total gerada?",
            "Qual é a receita total agrupada por região do país?",
            "Qual foi o método de pagamento mais utilizado nas vendas?",
            "Qual é o ticket médio das vendas separadas por categoria de produto?",
            "Quantos pedidos foram cancelados ou estão pendentes?",
            "Quais produtos estão com estoque zerado e precisam de revisão?",
            "Quais são os 5 fornecedores com a maior quantidade de unidades vendidas?",
            "Quais são os 10 produtos com a melhor média de avaliação (nota do produto)?",
            "Quais são os principais clientes do segmento 'Campeões' que mais gastaram na loja?",
            "Quantos pedidos em média um cliente da região Nordeste realiza?",
            "Qual a distribuição percentual de clientes por segmento RFM?",
            "Qual é o tempo médio de resolução de tickets por tipo de problema?",
            "Quais agentes de suporte possuem a melhor nota média de satisfação?",
            "Quais clientes possuem o maior número de tickets de suporte?",
            "Qual é a proporção de avaliações NPS classificadas como 'Promotores'?",
            "Quais os comentários das avaliações de pedidos com nota baixa (1 ou 2)?",
            "Quais canais de aquisição geram o maior número de compras e adições ao carrinho?",
            "Qual é o dispositivo de navegação mais utilizado pelos clientes (mobile, desktop)?",
            "Qual é a taxa de abandono de carrinho média por canal de aquisição?",
            "Como as notas de avaliação do suporte variam de acordo com o tempo de resolução do ticket?"
        ]
