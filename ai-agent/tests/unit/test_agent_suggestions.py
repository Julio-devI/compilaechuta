"""
Testes unitários para o método VCommerceAgent.initial_suggestions().

Cobrem o fluxo feliz, fallback em falhas esperadas e garantias
de que o método não interage com histórico, ask() ou execução SQL.
"""

import pytest

from vcommerce_ai_agent.agent import VCommerceAgent
from vcommerce_ai_agent.core.exceptions import LLMParseError, LLMQuotaError
from vcommerce_ai_agent.llm.suggestions_generator import (
    FALLBACK_SUGGESTIONS,
    select_fallback_suggestions,
)


@pytest.fixture
def agent(tmp_path):
    db_path = str(tmp_path / "test.db")
    return VCommerceAgent(db_path=db_path)


# ---------------------------------------------------------------------------
# Fluxo feliz
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_initial_suggestions_returns_five_when_llm_ok(agent, monkeypatch):
    expected = ["A?", "B?", "C?", "D?", "E?"]

    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, previous_suggestions=None, model=None):
        return (expected, 10)

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    result = await agent.initial_suggestions()
    assert result == expected


@pytest.mark.asyncio
async def test_initial_suggestions_uses_load_schema(agent, monkeypatch):
    calls = []

    async def fake_load_schema():
        calls.append("load_schema")
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, previous_suggestions=None, model=None):
        return (["A?", "B?", "C?", "D?", "E?"], None)

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    await agent.initial_suggestions()
    assert calls == ["load_schema"]


@pytest.mark.asyncio
async def test_initial_suggestions_passes_llm_model(agent, monkeypatch):
    captured = {}

    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, previous_suggestions=None, model=None):
        captured["model"] = model
        return (["A?", "B?", "C?", "D?", "E?"], None)

    agent._llm_model = "custom-model"
    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    await agent.initial_suggestions()
    assert captured["model"] == "custom-model"


@pytest.mark.asyncio
async def test_initial_suggestions_passes_previous_suggestions(agent, monkeypatch):
    captured = {}
    previous = ["Qual é a receita total agrupada por região do país?"]

    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, previous_suggestions=None, model=None):
        captured["previous_suggestions"] = previous_suggestions
        return (["A?", "B?", "C?", "D?", "E?"], None)

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    await agent.initial_suggestions(previous_suggestions=previous)

    assert captured["previous_suggestions"] == previous


# ---------------------------------------------------------------------------
# Fallbacks
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_initial_suggestions_fallback_on_schema_error(agent, monkeypatch):
    async def fake_load_schema():
        raise FileNotFoundError("schema missing")

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)

    result = await agent.initial_suggestions()
    assert result == list(FALLBACK_SUGGESTIONS)


@pytest.mark.asyncio
async def test_initial_suggestions_fallback_on_llm_error(agent, monkeypatch):
    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, previous_suggestions=None, model=None):
        raise LLMQuotaError("quota excedida")

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    result = await agent.initial_suggestions()
    assert result == list(FALLBACK_SUGGESTIONS)


@pytest.mark.asyncio
async def test_initial_suggestions_fallback_on_parse_error(agent, monkeypatch):
    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, previous_suggestions=None, model=None):
        raise LLMParseError("json invalido")

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    result = await agent.initial_suggestions()
    assert result == list(FALLBACK_SUGGESTIONS)


@pytest.mark.asyncio
async def test_initial_suggestions_fallback_avoids_previous_suggestions(
    agent, monkeypatch
):
    previous = list(FALLBACK_SUGGESTIONS)

    async def fake_load_schema():
        raise RuntimeError("schema error")

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)

    result = await agent.initial_suggestions(previous_suggestions=previous)

    assert result == select_fallback_suggestions(previous)
    assert not set(result).intersection(previous)


# ---------------------------------------------------------------------------
# Isolamento de histórico, ask() e db.execute_query()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_initial_suggestions_does_not_alter_history(agent, monkeypatch):
    agent._history = [{"role": "user", "content": "fake", "sql": None}]

    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, previous_suggestions=None, model=None):
        return (["A?", "B?", "C?", "D?", "E?"], None)

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    await agent.initial_suggestions()
    assert agent._history == [{"role": "user", "content": "fake", "sql": None}]


@pytest.mark.asyncio
async def test_initial_suggestions_does_not_call_ask(agent, monkeypatch):
    calls = []

    async def fake_ask(question):
        calls.append("ask")
        return None

    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, previous_suggestions=None, model=None):
        return (["A?", "B?", "C?", "D?", "E?"], None)

    monkeypatch.setattr(agent, "ask", fake_ask)
    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    await agent.initial_suggestions()
    assert calls == []


@pytest.mark.asyncio
async def test_initial_suggestions_does_not_execute_query(agent, monkeypatch):
    calls = []

    async def fake_execute(sql):
        calls.append("execute")
        return ([], False)

    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, previous_suggestions=None, model=None):
        return (["A?", "B?", "C?", "D?", "E?"], None)

    monkeypatch.setattr(agent._db, "execute_query", fake_execute)
    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    await agent.initial_suggestions()
    assert calls == []


# ---------------------------------------------------------------------------
# Fallback como cópia independente
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fallback_returns_independent_copy(agent, monkeypatch):
    async def fake_load_schema():
        raise RuntimeError("schema error")

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)

    result1 = await agent.initial_suggestions()
    result2 = await agent.initial_suggestions()

    assert result1 == list(FALLBACK_SUGGESTIONS)
    assert result2 == list(FALLBACK_SUGGESTIONS)
    assert result1 is not result2
    result1.append("extra")
    assert len(result2) == len(FALLBACK_SUGGESTIONS)
