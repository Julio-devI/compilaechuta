"""Testes do contrato estruturado de resposta do VCommerceAgent."""

import pytest

from src.agent import VCommerceAgent
from src.core.exceptions import (
    ErrorCode,
    LLMAuthenticationError,
    LLMInternalError,
    LLMInvalidRequestError,
    LLMParseError,
    LLMQuotaError,
    LLMRateLimitError,
    LLMTimeoutError,
    LLMUnavailableError,
    LLMUnknownError,
)
from src.llm import insight_generator


async def _fake_load_schema():
    return (
        "schema",
        {
            "tables": {
                "dim_cliente": {
                    "columns": [{"name": "total", "type": "INTEGER"}],
                    "foreign_keys": [],
                }
            }
        },
    )


def _fake_insight(chart=None, extra=None):
    payload = {
        "activity": "Analisei os clientes retornados pela consulta.",
        "answer_sections": [
            {"title": "Resultado", "content": "Foram encontrados 10 clientes."}
        ],
        "sources_summary": {
            "text": "Fonte de dados consultada: dim_cliente."
        },
        "chart": chart,
    }
    if extra:
        payload.update(extra)
    return payload


@pytest.mark.asyncio
async def test_empty_input_returns_input_error():
    agent = VCommerceAgent(db_path=":memory:")

    response = await agent.ask("")

    assert response.status == "error"
    assert response.error is not None
    assert response.error.code == ErrorCode.EMPTY_INPUT
    assert response.error.stage == "input"
    assert response.error.retryable is False
    assert response.sql == ""


@pytest.mark.asyncio
async def test_schema_failure_returns_schema_error(monkeypatch):
    agent = VCommerceAgent(db_path=":memory:")

    async def fake_load_schema():
        raise RuntimeError("schema indisponivel")

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)

    response = await agent.ask("Quantos clientes existem?")

    assert response.status == "error"
    assert response.error is not None
    assert response.error.code == ErrorCode.SCHEMA_LOAD_ERROR
    assert response.error.stage == "schema"
    assert response.error.retryable is False


@pytest.mark.asyncio
async def test_sql_validation_failure_returns_structured_error(monkeypatch):
    agent = VCommerceAgent(db_path=":memory:")

    async def fake_generate_sql(*args, **kwargs):
        return "DROP TABLE dim_cliente"

    async def fake_sql_correction(*args, **kwargs):
        return "DROP TABLE dim_cliente"

    async def no_sleep(*args, **kwargs):
        return None

    monkeypatch.setattr(agent, "_load_schema", _fake_load_schema)
    monkeypatch.setattr("src.agent.generate_sql", fake_generate_sql)
    monkeypatch.setattr("src.agent.generate_sql_correction", fake_sql_correction)
    monkeypatch.setattr("src.agent.asyncio.sleep", no_sleep)

    response = await agent.ask("Apague clientes")

    assert response.status == "error"
    assert response.error is not None
    assert response.error.stage == "sql_validation"
    assert response.error.retryable is False


@pytest.mark.parametrize(
    ("exc", "expected_code", "retryable"),
    [
        (
            LLMAuthenticationError("Chave inválida."),
            ErrorCode.LLM_AUTHENTICATION_ERROR,
            False,
        ),
        (
            LLMRateLimitError("Limite por minuto atingido."),
            ErrorCode.LLM_RATE_LIMIT_ERROR,
            True,
        ),
        (
            LLMQuotaError("Limite diário atingido."),
            ErrorCode.LLM_QUOTA_ERROR,
            False,
        ),
        (
            LLMTimeoutError("Tempo excedido."),
            ErrorCode.LLM_TIMEOUT_ERROR,
            True,
        ),
        (
            LLMUnavailableError("Serviço indisponível."),
            ErrorCode.LLM_UNAVAILABLE_ERROR,
            True,
        ),
        (
            LLMInvalidRequestError("Requisição inválida."),
            ErrorCode.LLM_INVALID_REQUEST_ERROR,
            False,
        ),
        (
            LLMInternalError("Erro interno."),
            ErrorCode.LLM_INTERNAL_ERROR,
            True,
        ),
        (
            LLMUnknownError("Erro desconhecido."),
            ErrorCode.LLM_UNKNOWN_ERROR,
            False,
        ),
    ],
)
def test_llm_errors_keep_specific_public_codes(exc, expected_code, retryable):
    agent = VCommerceAgent(db_path=":memory:")

    response = agent._make_llm_error_response(exc, sql="SELECT 1")

    assert response.status == "error"
    assert response.error is not None
    assert response.error.code == expected_code
    assert response.error.stage == "llm"
    assert response.error.message == str(exc)
    assert response.error.retryable is retryable
    assert response.sql == "SELECT 1"


def test_extract_sources_filters_cte_names():
    agent = VCommerceAgent(db_path=":memory:")
    agent._technical_schema = {
        "tables": {
            "dim_cliente": {"columns": []},
        }
    }

    sql = """
    WITH clientes_sudeste AS (
        SELECT id_cliente FROM dim_cliente WHERE regiao = 'Sudeste'
    )
    SELECT COUNT(*) AS total_clientes FROM clientes_sudeste;
    """

    sources = agent._extract_sources(sql)

    assert [source.table for source in sources] == ["dim_cliente"]


@pytest.mark.asyncio
async def test_success_keeps_data_from_database_and_ignores_llm_data(monkeypatch):
    agent = VCommerceAgent(db_path=":memory:")
    db_rows = [{"total": 10}]

    async def fake_generate_sql(*args, **kwargs):
        return "SELECT total FROM dim_cliente"

    async def fake_execute_query(sql):
        return db_rows, False

    async def fake_generate_insight(*args, **kwargs):
        return _fake_insight(extra={"data": [{"total": 999}]})

    monkeypatch.setattr(agent, "_load_schema", _fake_load_schema)
    monkeypatch.setattr("src.agent.generate_sql", fake_generate_sql)
    monkeypatch.setattr("src.agent.apply_layer_2", lambda sql, *_args: sql)
    monkeypatch.setattr(agent._db, "execute_query", fake_execute_query)
    monkeypatch.setattr("src.agent.generate_insight", fake_generate_insight)

    response = await agent.ask("Quantos clientes existem?")

    assert response.status == "success"
    assert response.error is None
    assert response.sql == "SELECT total FROM dim_cliente"
    assert response.data == db_rows
    assert response.presentation is not None
    assert response.presentation.activity.startswith("Analisei")
    assert response.presentation.sources_summary is not None
    assert response.presentation.sources_summary.tables[0].table == "dim_cliente"
    assert agent._history[1]["sql"] == response.sql


@pytest.mark.asyncio
async def test_success_preserves_scalar_data_as_database_rows(monkeypatch):
    agent = VCommerceAgent(db_path=":memory:")
    db_rows = [{"receita_total": 12345.67}]

    async def fake_generate_sql(*args, **kwargs):
        return "SELECT receita_total FROM dim_cliente"

    async def fake_execute_query(sql):
        return db_rows, False

    monkeypatch.setattr(agent, "_load_schema", _fake_load_schema)
    monkeypatch.setattr("src.agent.generate_sql", fake_generate_sql)
    monkeypatch.setattr("src.agent.apply_layer_2", lambda sql, *_args: sql)
    monkeypatch.setattr(agent._db, "execute_query", fake_execute_query)
    async def fake_generate_insight(*args, **kwargs):
        return _fake_insight()

    monkeypatch.setattr("src.agent.generate_insight", fake_generate_insight)

    response = await agent.ask("Qual a receita total?")

    assert response.status == "success"
    assert response.data == [{"receita_total": 12345.67}]


@pytest.mark.asyncio
async def test_success_preserves_empty_database_result(monkeypatch):
    agent = VCommerceAgent(db_path=":memory:")

    async def fake_generate_sql(*args, **kwargs):
        return "SELECT total FROM dim_cliente"

    async def fake_execute_query(sql):
        return [], False

    monkeypatch.setattr(agent, "_load_schema", _fake_load_schema)
    monkeypatch.setattr("src.agent.generate_sql", fake_generate_sql)
    monkeypatch.setattr("src.agent.apply_layer_2", lambda sql, *_args: sql)
    monkeypatch.setattr(agent._db, "execute_query", fake_execute_query)
    async def fake_generate_insight(*args, **kwargs):
        return _fake_insight()

    monkeypatch.setattr("src.agent.generate_insight", fake_generate_insight)

    response = await agent.ask("Quais clientes existem?")

    assert response.status == "success"
    assert response.data == []
    assert response.chart is None


@pytest.mark.asyncio
async def test_invalid_chart_is_discarded(monkeypatch):
    agent = VCommerceAgent(db_path=":memory:")

    async def fake_generate_sql(*args, **kwargs):
        return "SELECT total FROM dim_cliente"

    async def fake_execute_query(sql):
        return [{"total": 10}], False

    invalid_chart = {
        "type": "bar",
        "x_axis": "coluna_inexistente",
        "y_axis": "total",
        "title": "Clientes",
    }

    monkeypatch.setattr(agent, "_load_schema", _fake_load_schema)
    monkeypatch.setattr("src.agent.generate_sql", fake_generate_sql)
    monkeypatch.setattr("src.agent.apply_layer_2", lambda sql, *_args: sql)
    monkeypatch.setattr(agent._db, "execute_query", fake_execute_query)
    async def fake_generate_insight(*args, **kwargs):
        return _fake_insight(chart=invalid_chart)

    monkeypatch.setattr("src.agent.generate_insight", fake_generate_insight)

    response = await agent.ask("Quantos clientes existem?")

    assert response.status == "success"
    assert response.chart is None


@pytest.mark.asyncio
async def test_insight_parse_error_returns_structured_error(monkeypatch):
    agent = VCommerceAgent(db_path=":memory:")

    async def fake_generate_sql(*args, **kwargs):
        return "SELECT total FROM dim_cliente"

    async def fake_execute_query(sql):
        return [{"total": 10}], False

    async def fake_generate_insight(*args, **kwargs):
        raise LLMParseError("JSON malformado")

    monkeypatch.setattr(agent, "_load_schema", _fake_load_schema)
    monkeypatch.setattr("src.agent.generate_sql", fake_generate_sql)
    monkeypatch.setattr("src.agent.apply_layer_2", lambda sql, *_args: sql)
    monkeypatch.setattr(agent._db, "execute_query", fake_execute_query)
    monkeypatch.setattr("src.agent.generate_insight", fake_generate_insight)

    response = await agent.ask("Quantos clientes existem?")

    assert response.status == "error"
    assert response.error is not None
    assert response.error.code == ErrorCode.INSIGHT_PARSE_ERROR
    assert response.error.stage == "insight_generation"
    assert response.error.retryable is True
    assert response.data is None
    assert response.sql == "SELECT total FROM dim_cliente"


@pytest.mark.asyncio
async def test_database_timeout_returns_structured_error(monkeypatch):
    agent = VCommerceAgent(db_path=":memory:")

    async def fake_generate_sql(*args, **kwargs):
        return "SELECT total FROM dim_cliente"

    async def fake_execute_query(sql):
        raise TimeoutError("timeout")

    monkeypatch.setattr(agent, "_load_schema", _fake_load_schema)
    monkeypatch.setattr("src.agent.generate_sql", fake_generate_sql)
    monkeypatch.setattr("src.agent.apply_layer_2", lambda sql, *_args: sql)
    monkeypatch.setattr(agent._db, "execute_query", fake_execute_query)

    response = await agent.ask("Quantos clientes existem?")

    assert response.status == "error"
    assert response.error is not None
    assert response.error.code == ErrorCode.EXECUTION_TIMEOUT
    assert response.error.stage == "database"
    assert response.error.retryable is True


def test_insight_generator_validator_retries_until_valid(monkeypatch):
    calls = []

    class FakeLLMAgent:
        def __init__(self, *args, **kwargs):
            pass

        async def run(self, question, validator=None):
            invalid = '{"activity": "ok"}'
            valid = (
                '{"activity": "Analisei os dados.", '
                '"answer_sections": [{"title": "Resultado", "content": "10 clientes"}], '
                '"sources_summary": {"text": "Fonte: dim_cliente."}, '
                '"data": [{"total": 999}], '
                '"chart": null}'
            )
            for raw in (invalid, valid):
                calls.append(raw)
                try:
                    if validator:
                        validator(raw)
                    return raw
                except LLMParseError:
                    continue
            raise AssertionError("Validator deveria aceitar a segunda resposta.")

    monkeypatch.setattr(insight_generator, "LLMAgent", FakeLLMAgent)

    async def run():
        return await insight_generator.generate_insight(
            "Pergunta", [{"total": 10}], "SELECT total FROM dim_cliente"
        )

    import asyncio

    result = asyncio.run(run())

    assert len(calls) == 2
    assert "data" not in result
    assert result["activity"] == "Analisei os dados."
