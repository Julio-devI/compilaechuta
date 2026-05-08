"""
Classe pública do agente de IA.

Orquestra as duas chamadas ao LLM (geração de SQL e geração de insight)
e expõe a interface consumida pelo backend FastAPI.
"""

import asyncio
from dataclasses import dataclass
from typing import Any, Literal

from src.db import Database
from src.exceptions import GuardrailError, LLMError
from src.guardrails import (
    apply_layer_2,
    validate_empty_input,
    validate_input_length,
    validate_prompt_injection,
)
from src.insight_generator import generate_insight
from src.schema import build_allowlist, format_schema, load_descriptions
from src.sql_generator import generate_sql, generate_sql_correction


@dataclass
class ChartSuggestion:
    """Sugestão de visualização gráfica para o frontend."""

    type: Literal["bar", "line", "pie", "area"]
    x_axis: str | None
    y_axis: str | None
    title: str


@dataclass
class AgentResponse:
    """Resposta completa do agente para uma pergunta do usuário."""

    text: str
    data: list[dict] | None
    chart: ChartSuggestion | None
    sql: str
    error: bool
    out_of_scope: bool
    truncated: bool = False


class VCommerceAgent:
    """Agente Text-to-SQL para o domínio V-Commerce."""

    def __init__(
        self,
        db_path: str,
        excluded_tables: set[str] | None = None,
        max_rows: int = 1000,
        query_timeout_seconds: int = 10,
        llm_model: str = "gemini-2.5-flash",
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

    def invalidate_schema(self) -> None:
        """Limpa o cache do schema, forçando recarregamento na próxima consulta."""
        self._schema_text = None
        self._technical_schema = None

    async def _load_schema(self) -> tuple[str, dict[str, Any]]:
        """Carrega e formata o schema do banco (lazy caching)."""
        if self._schema_text is not None and self._technical_schema is not None:
            return self._schema_text, self._technical_schema

        descriptions = load_descriptions()
        technical_schema = await self._db.get_technical_schema()
        self._technical_schema = technical_schema
        self._schema_text = format_schema(
            technical_schema, descriptions, excluded_tables=self._excluded_tables
        )
        return self._schema_text, self._technical_schema

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

        Raises:
            LLMError: Se a comunicação com a API Gemini falhar em qualquer chamada.
        """
        sql = ""

        # Camada 1: validação do input do usuário (pré-LLM)
        try:
            validate_empty_input(question)
            validate_input_length(question)
            validate_prompt_injection(question)
        except GuardrailError:
            return AgentResponse(
                text="Não foi possível processar sua pergunta. Tente reformulá-la.",
                data=None,
                chart=None,
                sql="",
                error=True,
                out_of_scope=False,
                truncated=False,
            )

        # Etapa 1: carregar schema
        try:
            schema, technical_schema = await self._load_schema()
        except (FileNotFoundError, RuntimeError) as exc:
            return AgentResponse(
                text=f"Erro ao carregar o schema do banco: {exc}",
                data=None,
                chart=None,
                sql="",
                error=True,
                out_of_scope=False,
                truncated=False,
            )

        # Etapa 2: gerar SQL
        try:
            sql = await generate_sql(question, schema, model=self._llm_model)
        except ValueError as exc:
            return AgentResponse(
                text="Não foi possível processar sua pergunta. Tente reformulá-la.",
                data=None,
                chart=None,
                sql=sql,
                error=True,
                out_of_scope=False,
                truncated=False,
            )
        # Nota: LLMError propaga diretamente para o backend tratar

        # Etapa 2.5: aplicar Camada 2 com loop de autocorreção
        allowlist = build_allowlist(
            technical_schema, excluded_tables=self._excluded_tables
        )
        for attempt in range(3):
            try:
                sql = apply_layer_2(sql, allowlist, self._max_rows)
                break
            except GuardrailError as exc:
                if attempt == 2:
                    return AgentResponse(
                        text="Não foi possível processar sua pergunta. Tente reformulá-la.",
                        data=None,
                        chart=None,
                        sql=sql,
                        error=True,
                        out_of_scope=False,
                        truncated=False,
                    )
                sql = await generate_sql_correction(
                    question=question,
                    sql=sql,
                    error=str(exc),
                    schema=schema,
                    model=self._llm_model,
                )
                await asyncio.sleep(1 * (2 ** attempt))

        # Etapa 3: detectar fora do escopo
        if sql.strip().upper().startswith("FORA_DO_ESCOPO"):
            return AgentResponse(
                text=sql,
                data=None,
                chart=None,
                sql="",
                error=False,
                out_of_scope=True,
                truncated=False,
            )

        # Etapa 4: executar SQL
        try:
            rows, truncated = await self._db.execute_query(sql)
        except (RuntimeError, TimeoutError):
            return AgentResponse(
                text="Não foi possível processar sua pergunta. Tente reformulá-la.",
                data=None,
                chart=None,
                sql=sql,
                error=True,
                out_of_scope=False,
                truncated=False,
            )

        # Etapa 5: gerar insight
        # Nota: LLMError propaga diretamente para o backend tratar
        insight = await generate_insight(question, rows, sql, model=self._llm_model)

        # Etapa 6: montar resposta
        chart = None
        chart_data = insight.get("chart")
        if isinstance(chart_data, dict):
            try:
                chart = ChartSuggestion(
                    type=chart_data.get("type", "bar"),
                    x_axis=chart_data.get("x_axis"),
                    y_axis=chart_data.get("y_axis"),
                    title=chart_data.get("title", ""),
                )
            except (TypeError, KeyError):
                chart = None

        return AgentResponse(
            text=insight["text"],
            data=insight.get("data"),
            chart=chart,
            sql=sql,
            error=False,
            out_of_scope=False,
            truncated=truncated,
        )

    def initial_suggestions(self) -> list[str]:
        """
        Retorna uma lista fixa de sugestões iniciais de perguntas.

        Cobre os 3 domínios obrigatórios (vendas, suporte, avaliações)
        mais dimensões de cliente e produto.
        """
        return [
            "Quais os 10 produtos mais vendidos no último mês?",
            "Qual a receita total por região neste trimestre?",
            "Quais produtos geram mais tickets de suporte?",
            "Qual o NPS médio por categoria de produto?",
            "Qual o tempo médio de resolução de tickets por agente?",
        ]
