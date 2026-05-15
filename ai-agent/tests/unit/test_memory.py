"""
Testes unitários para o gerenciamento de memória de conversa do VCommerceAgent.
Cobre funcionalidades stateful, truncamento, export/import e formatação de histórico.
"""

import pytest

from vcommerce_ai_agent.agent import DeveloperDebug, UserResponse, VCommerceAgent, AgentResponse
from vcommerce_ai_agent.core import config
from vcommerce_ai_agent.core.exceptions import ErrorCode, LLMParseError
from vcommerce_ai_agent.llm.sql_generator import format_history_for_sql
from vcommerce_ai_agent.llm.insight_generator import format_history_for_insight


# ---------------------------------------------------------------------------
# agent.py - Métodos de Histórico
# ---------------------------------------------------------------------------

def test_agent_initializes_empty_history():
    agent = VCommerceAgent(db_path=":memory:")
    assert agent._history == []


def test_clear_history():
    agent = VCommerceAgent(db_path=":memory:")
    agent._history = [{"role": "user", "content": "teste", "sql": None}]
    agent.clear_history()
    assert agent._history == []


def test_append_to_history():
    agent = VCommerceAgent(db_path=":memory:")
    resp = AgentResponse(
        status="success",
        user_response=UserResponse(
            answer_text="Insight",
            sources_text=None,
            data=[{"a": 1}],
            chart=None,
            truncated=False,
        ),
        developer_debug=DeveloperDebug(
            sql="SELECT 1",
            error=None,
        ),
    )
    agent._append_to_history("Pergunta", resp)

    assert len(agent._history) == 2
    assert agent._history[0] == {"role": "user", "content": "Pergunta", "sql": None}
    assert agent._history[1] == {"role": "assistant", "content": "Insight", "sql": "SELECT 1"}


def test_history_truncation(monkeypatch):
    monkeypatch.setattr(config, "MAX_HISTORY_TURNS", 2)
    agent = VCommerceAgent(db_path=":memory:")
    
    resp = AgentResponse(
        status="success",
        user_response=UserResponse(
            answer_text="Insight",
            sources_text=None,
            data=[],
            chart=None,
            truncated=False,
        ),
        developer_debug=DeveloperDebug(
            sql="SELECT 1",
            error=None,
        ),
    )
    
    # Adicionar 3 turnos (6 mensagens) - Limite é 2 (4 mensagens)
    agent._append_to_history("P1", resp)
    agent._append_to_history("P2", resp)
    agent._append_to_history("P3", resp)
    
    assert len(agent._history) == 4
    assert agent._history[0]["content"] == "P2"
    assert agent._history[2]["content"] == "P3"


# ---------------------------------------------------------------------------
# agent.py - Export / Import
# ---------------------------------------------------------------------------

def test_export_history():
    agent = VCommerceAgent(db_path=":memory:")
    agent._history = [
        {"role": "user", "content": "Q1", "sql": None},
        {"role": "assistant", "content": "A1", "sql": "SQL"}
    ]
    exported = agent.export_history()
    assert exported == agent._history
    assert exported is not agent._history  # Deve ser uma cópia


def test_import_history_valid():
    agent = VCommerceAgent(db_path=":memory:")
    history = [
        {"role": "user", "content": "Q1", "sql": None},
        {"role": "assistant", "content": "A1", "sql": "SQL"}
    ]
    agent.import_history(history)
    assert agent._history == history


def test_import_history_truncates(monkeypatch):
    monkeypatch.setattr(config, "MAX_HISTORY_TURNS", 1)
    agent = VCommerceAgent(db_path=":memory:")
    history = [
        {"role": "user", "content": "Q1", "sql": None},
        {"role": "assistant", "content": "A1", "sql": "SQL"},
        {"role": "user", "content": "Q2", "sql": None},
        {"role": "assistant", "content": "A2", "sql": "SQL2"}
    ]
    agent.import_history(history)
    assert len(agent._history) == 2
    assert agent._history[0]["content"] == "Q2"


def test_import_history_invalid_type():
    agent = VCommerceAgent(db_path=":memory:")
    with pytest.raises(ValueError, match="lista de dicionários"):
        agent.import_history("not a list")


def test_import_history_invalid_entry_type():
    agent = VCommerceAgent(db_path=":memory:")
    with pytest.raises(ValueError, match="deve ser um dicionário"):
        agent.import_history(["not a dict"])


def test_import_history_invalid_role():
    agent = VCommerceAgent(db_path=":memory:")
    with pytest.raises(ValueError, match="'role' inválido"):
        agent.import_history([{"role": "system", "content": "C"}])


def test_import_history_invalid_content():
    agent = VCommerceAgent(db_path=":memory:")
    with pytest.raises(ValueError, match="'content' com texto não vazio"):
        agent.import_history([{"role": "user", "content": ""}])


def test_import_history_rejects_incomplete_pair():
    agent = VCommerceAgent(db_path=":memory:")
    with pytest.raises(ValueError, match="pares completos"):
        agent.import_history([{"role": "user", "content": "Q1", "sql": None}])


def test_import_history_rejects_invalid_pair_order():
    agent = VCommerceAgent(db_path=":memory:")
    history = [
        {"role": "assistant", "content": "A1", "sql": "SELECT 1"},
        {"role": "user", "content": "Q1", "sql": None},
    ]
    with pytest.raises(ValueError, match="alternar pares user/assistant"):
        agent.import_history(history)


def test_import_history_rejects_user_sql():
    agent = VCommerceAgent(db_path=":memory:")
    history = [
        {"role": "user", "content": "Q1", "sql": "SELECT 1"},
        {"role": "assistant", "content": "A1", "sql": "SELECT 1"},
    ]
    with pytest.raises(ValueError, match="role='user'.*'sql' nulo"):
        agent.import_history(history)


def test_import_history_rejects_assistant_without_sql():
    agent = VCommerceAgent(db_path=":memory:")
    history = [
        {"role": "user", "content": "Q1", "sql": None},
        {"role": "assistant", "content": "A1", "sql": None},
    ]
    with pytest.raises(ValueError, match="role='assistant'.*'sql'"):
        agent.import_history(history)


# ---------------------------------------------------------------------------
# Formatadores
# ---------------------------------------------------------------------------

def test_format_history_for_sql_empty():
    assert format_history_for_sql(None) == ""
    assert format_history_for_sql([]) == ""


def test_format_history_for_sql_filled():
    history = [
        {"role": "user", "content": "Q1", "sql": None},
        {"role": "assistant", "content": "A1", "sql": "SELECT 1"}
    ]
    formatted = format_history_for_sql(history)
    assert "Interação 1" in formatted
    assert "Pergunta: Q1" in formatted
    assert "Resposta: A1" in formatted
    assert "SQL gerado: SELECT 1" in formatted
    assert "Resolva pronomes" in formatted


def test_format_history_for_insight_empty():
    assert format_history_for_insight(None) == ""
    assert format_history_for_insight([]) == ""


def test_format_history_for_insight_filled():
    history = [
        {"role": "user", "content": "Q1", "sql": None},
        {"role": "assistant", "content": "A1", "sql": "SELECT 1"}
    ]
    formatted = format_history_for_insight(history)
    assert "Interação 1" in formatted
    assert "Pergunta: Q1" in formatted
    assert "Resposta: A1" in formatted
    assert "Mantenha coerência com as respostas anteriores" in formatted
    assert "SQL" not in formatted  # O formatador de insight não precisa exibir SQL diretamente se não solicitado


@pytest.mark.asyncio
async def test_ask_returns_controlled_response_when_generate_sql_parse_fails(monkeypatch):
    agent = VCommerceAgent(db_path=":memory:")

    async def fake_load_schema():
        return "schema", {"dim_cliente": {"columns": []}}

    async def fake_generate_sql(*args, **kwargs):
        raise LLMParseError("SQL malformado")

    monkeypatch.setattr(agent, "_load_schema", fake_load_schema)
    monkeypatch.setattr("vcommerce_ai_agent.agent.generate_sql", fake_generate_sql)

    response = await agent.ask("Qual a receita total?")

    assert response.status == "error"
    assert response.developer_debug.error is not None
    assert response.developer_debug.error.code == ErrorCode.SQL_PARSE_ERROR
    assert response.developer_debug.error.stage == "sql_generation"
    assert response.developer_debug.sql == ""
    assert agent._history == []
