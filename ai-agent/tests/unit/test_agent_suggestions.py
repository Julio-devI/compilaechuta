"""
Testes unitários para o método VCommerceAgent.initial_suggestions().

Cobrem o fluxo de retorno da lista fixa (sem histórico), geração
contextual via LLM (com histórico), fallback em falhas esperadas
e garantias de isolamento com ask() e execução SQL.
"""

import pytest

from vcommerce_ai_agent.agent import VCommerceAgent
from vcommerce_ai_agent.core.exceptions import LLMParseError, LLMQuotaError
from vcommerce_ai_agent.llm.suggestions_generator import INITIAL_SUGGESTIONS


@pytest.fixture
def agent(tmp_path):
    db_path = str(tmp_path / "test.db")
    return VCommerceAgent(db_path=db_path)


_SAMPLE_HISTORY = [
    {"role": "user", "content": "Quais os 10 produtos mais vendidos?", "sql": None},
    {"role": "assistant", "content": "Os 10 produtos mais vendidos são...", "sql": "SELECT ..."},
]


# ---------------------------------------------------------------------------
# Sem histórico: retorna lista fixa sem chamar LLM
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_initial_suggestions_returns_fixed_list_without_history(agent):
    result = await agent.initial_suggestions()
    assert result == list(INITIAL_SUGGESTIONS)


@pytest.mark.asyncio
async def test_initial_suggestions_returns_fixed_list_with_none_history(agent):
    result = await agent.initial_suggestions(history=None)
    assert result == list(INITIAL_SUGGESTIONS)


@pytest.mark.asyncio
async def test_initial_suggestions_returns_fixed_list_with_empty_history(agent):
    result = await agent.initial_suggestions(history=[])
    assert result == list(INITIAL_SUGGESTIONS)


@pytest.mark.asyncio
async def test_initial_suggestions_does_not_call_llm_without_history(
    agent, monkeypatch
):
    calls = []

    async def fake_load_schema():
        calls.append("load_schema")
        return ("schema_text", {"tables": {}})

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)

    await agent.initial_suggestions()
    assert calls == []


# ---------------------------------------------------------------------------
# Com histórico: gera sugestões contextuais via LLM
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_initial_suggestions_returns_five_when_llm_ok(agent, monkeypatch):
    expected = ["A?", "B?", "C?", "D?", "E?"]

    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, history=None, model=None):
        return (expected, 10)

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    result = await agent.initial_suggestions(history=_SAMPLE_HISTORY)
    assert result == expected


@pytest.mark.asyncio
async def test_initial_suggestions_uses_load_schema_with_history(agent, monkeypatch):
    calls = []

    async def fake_load_schema():
        calls.append("load_schema")
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, history=None, model=None):
        return (["A?", "B?", "C?", "D?", "E?"], None)

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    await agent.initial_suggestions(history=_SAMPLE_HISTORY)
    assert calls == ["load_schema"]


@pytest.mark.asyncio
async def test_initial_suggestions_passes_llm_model(agent, monkeypatch):
    captured = {}

    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, history=None, model=None):
        captured["model"] = model
        return (["A?", "B?", "C?", "D?", "E?"], None)

    agent._llm_model = "custom-model"
    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    await agent.initial_suggestions(history=_SAMPLE_HISTORY)
    assert captured["model"] == "custom-model"


@pytest.mark.asyncio
async def test_initial_suggestions_passes_history_to_generator(agent, monkeypatch):
    captured = {}

    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, history=None, model=None):
        captured["history"] = history
        return (["A?", "B?", "C?", "D?", "E?"], None)

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    await agent.initial_suggestions(history=_SAMPLE_HISTORY)

    assert captured["history"] == _SAMPLE_HISTORY


# ---------------------------------------------------------------------------
# Fallbacks (com histórico preenchido)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_initial_suggestions_fallback_on_schema_error(agent, monkeypatch):
    async def fake_load_schema():
        raise FileNotFoundError("schema missing")

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)

    result = await agent.initial_suggestions(history=_SAMPLE_HISTORY)
    assert result == list(INITIAL_SUGGESTIONS)


@pytest.mark.asyncio
async def test_initial_suggestions_fallback_on_llm_error(agent, monkeypatch):
    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, history=None, model=None):
        raise LLMQuotaError("quota excedida")

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    result = await agent.initial_suggestions(history=_SAMPLE_HISTORY)
    assert result == list(INITIAL_SUGGESTIONS)


@pytest.mark.asyncio
async def test_initial_suggestions_fallback_on_parse_error(agent, monkeypatch):
    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, history=None, model=None):
        raise LLMParseError("json invalido")

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    result = await agent.initial_suggestions(history=_SAMPLE_HISTORY)
    assert result == list(INITIAL_SUGGESTIONS)


# ---------------------------------------------------------------------------
# Isolamento de histórico interno, ask() e db.execute_query()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_initial_suggestions_does_not_alter_internal_history(
    agent, monkeypatch
):
    agent._history = [{"role": "user", "content": "fake", "sql": None}]

    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, history=None, model=None):
        return (["A?", "B?", "C?", "D?", "E?"], None)

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    await agent.initial_suggestions(history=_SAMPLE_HISTORY)
    assert agent._history == [{"role": "user", "content": "fake", "sql": None}]


@pytest.mark.asyncio
async def test_initial_suggestions_does_not_call_ask(agent, monkeypatch):
    calls = []

    async def fake_ask(question):
        calls.append("ask")
        return None

    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, history=None, model=None):
        return (["A?", "B?", "C?", "D?", "E?"], None)

    monkeypatch.setattr(agent, "ask", fake_ask)
    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    await agent.initial_suggestions(history=_SAMPLE_HISTORY)
    assert calls == []


@pytest.mark.asyncio
async def test_initial_suggestions_does_not_execute_query(agent, monkeypatch):
    calls = []

    async def fake_execute(sql):
        calls.append("execute")
        return ([], False)

    async def fake_load_schema():
        return ("schema_text", {"tables": {}})

    async def fake_generate(schema, history=None, model=None):
        return (["A?", "B?", "C?", "D?", "E?"], None)

    monkeypatch.setattr(agent._db, "execute_query", fake_execute)
    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr(
        "vcommerce_ai_agent.agent.generate_suggestions", fake_generate
    )

    await agent.initial_suggestions(history=_SAMPLE_HISTORY)
    assert calls == []


# ---------------------------------------------------------------------------
# Lista fixa retorna cópia independente
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fixed_list_returns_independent_copy(agent):
    result1 = await agent.initial_suggestions()
    result2 = await agent.initial_suggestions()

    assert result1 == list(INITIAL_SUGGESTIONS)
    assert result2 == list(INITIAL_SUGGESTIONS)
    assert result1 is not result2
    result1.append("extra")
    assert len(result2) == len(INITIAL_SUGGESTIONS)
