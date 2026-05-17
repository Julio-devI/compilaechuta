"""
Testes unitários para o módulo de geração de sugestões contextuais.

Cobrem o parser de JSON, validação das perguntas, formatação do
histórico e integração com o cliente LLM.
"""

import json
from unittest.mock import MagicMock

import pytest

from vcommerce_ai_agent.core import config
from vcommerce_ai_agent.core.exceptions import LLMParseError
from vcommerce_ai_agent.llm.suggestions_generator import (
    INITIAL_SUGGESTIONS,
    SUGGESTIONS_COUNT,
    _contains_markdown,
    _contains_physical_table_name,
    _contains_sql_keyword,
    _contains_technical_prefix,
    _extract_table_names,
    _format_history_for_suggestions,
    _parse_suggestions,
    generate_suggestions,
)


_SAMPLE_HISTORY = [
    {"role": "user", "content": "Quais os 10 produtos mais vendidos?", "sql": None},
    {"role": "assistant", "content": "Os 10 produtos mais vendidos são...", "sql": "SELECT ..."},
]


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------


def test_extract_table_names_from_schema():
    schema = """
    CREATE TABLE dim_cliente (id INTEGER PRIMARY KEY);
    CREATE TABLE fato_vendas (id INTEGER PRIMARY KEY);
    """
    assert _extract_table_names(schema) == {"dim_cliente", "fato_vendas"}


def test_contains_markdown_detects_fences():
    assert _contains_markdown("```json {} ```") is True
    assert _contains_markdown("`código`") is True
    assert _contains_markdown("Pergunta simples?") is False


def test_contains_sql_keyword_detects_keywords():
    assert _contains_sql_keyword("Qual SELECT mais usado?") is True
    assert _contains_sql_keyword("Quantos JOINs existem?") is True
    assert _contains_sql_keyword("Qual a receita total?") is False


def test_contains_technical_prefix_detects_prefixes():
    assert _contains_technical_prefix("Quais dim_clientes?") is True
    assert _contains_technical_prefix("Quais gold_vendas?") is True
    assert _contains_technical_prefix("Qual a receita?") is False


def test_contains_physical_table_name_detects_names():
    table_names = {"dim_cliente", "fato_vendas"}
    assert _contains_physical_table_name("Quais dim_cliente compraram?", table_names) is True
    assert _contains_physical_table_name("Qual a receita?", table_names) is False


# ---------------------------------------------------------------------------
# _format_history_for_suggestions
# ---------------------------------------------------------------------------


def test_format_history_returns_placeholder_when_empty():
    result = _format_history_for_suggestions(None)
    assert "Nenhuma interação" in result


def test_format_history_returns_placeholder_when_empty_list():
    result = _format_history_for_suggestions([])
    assert "Nenhuma interação" in result


def test_format_history_formats_turns():
    result = _format_history_for_suggestions(_SAMPLE_HISTORY)
    assert "Interação 1:" in result
    assert "Quais os 10 produtos mais vendidos?" in result
    assert "Os 10 produtos mais vendidos são..." in result
    assert "follow-up" in result


# ---------------------------------------------------------------------------
# _parse_suggestions
# ---------------------------------------------------------------------------


def test_parse_suggestions_accepts_valid_json():
    raw = json.dumps({
        "suggestions": [
            "Pergunta um?",
            "Pergunta dois?",
            "Pergunta três?",
            "Pergunta quatro?",
            "Pergunta cinco?",
        ]
    })
    result = _parse_suggestions(raw, set())
    assert len(result) == SUGGESTIONS_COUNT
    assert result[0] == "Pergunta um?"


def test_parse_suggestions_accepts_wrapped_markdown():
    inner = json.dumps({
        "suggestions": [
            "Pergunta um?",
            "Pergunta dois?",
            "Pergunta três?",
            "Pergunta quatro?",
            "Pergunta cinco?",
        ]
    })
    raw = f"```json\n{inner}\n```"
    result = _parse_suggestions(raw, set())
    assert len(result) == SUGGESTIONS_COUNT


def test_parse_suggestions_rejects_malformed_json():
    with pytest.raises(LLMParseError, match="JSON"):
        _parse_suggestions("{invalid", set())


def test_parse_suggestions_rejects_missing_field():
    raw = json.dumps({"outro": []})
    with pytest.raises(LLMParseError, match="suggestions"):
        _parse_suggestions(raw, set())


def test_parse_suggestions_rejects_non_list():
    raw = json.dumps({"suggestions": "não é lista"})
    with pytest.raises(LLMParseError, match="lista"):
        _parse_suggestions(raw, set())


def test_parse_suggestions_rejects_empty_item():
    raw = json.dumps({
        "suggestions": [
            "Pergunta um?",
            "Pergunta dois?",
            "Pergunta três?",
            "Pergunta quatro?",
            "",
        ]
    })
    with pytest.raises(LLMParseError, match="Apenas 4"):
        _parse_suggestions(raw, set())


def test_parse_suggestions_rejects_missing_question_mark():
    raw = json.dumps({
        "suggestions": [
            "Pergunta um?",
            "Pergunta dois?",
            "Pergunta três?",
            "Pergunta quatro?",
            "Pergunta sem ponto final",
        ]
    })
    with pytest.raises(LLMParseError, match="Apenas 4"):
        _parse_suggestions(raw, set())


def test_parse_suggestions_removes_duplicates_preserving_order():
    raw = json.dumps({
        "suggestions": [
            "Pergunta um?",
            "Pergunta um?",
            "Pergunta dois?",
            "Pergunta três?",
            "Pergunta quatro?",
            "Pergunta cinco?",
        ]
    })
    result = _parse_suggestions(raw, set())
    assert len(result) == SUGGESTIONS_COUNT
    assert result == [
        "Pergunta um?",
        "Pergunta dois?",
        "Pergunta três?",
        "Pergunta quatro?",
        "Pergunta cinco?",
    ]


def test_parse_suggestions_rejects_less_than_five():
    raw = json.dumps({
        "suggestions": [
            "Pergunta um?",
            "Pergunta dois?",
            "Pergunta três?",
        ]
    })
    with pytest.raises(LLMParseError, match="Apenas 3"):
        _parse_suggestions(raw, set())


def test_parse_suggestions_rejects_sql_keyword():
    raw = json.dumps({
        "suggestions": [
            "Pergunta um?",
            "Pergunta dois?",
            "Pergunta três?",
            "Pergunta quatro?",
            "Qual SELECT mais usado?",
        ]
    })
    with pytest.raises(LLMParseError, match="Apenas 4"):
        _parse_suggestions(raw, set())


def test_parse_suggestions_rejects_physical_table_name():
    raw = json.dumps({
        "suggestions": [
            "Pergunta um?",
            "Pergunta dois?",
            "Pergunta três?",
            "Pergunta quatro?",
            "Quais dim_cliente compraram?",
        ]
    })
    table_names = {"dim_cliente"}
    with pytest.raises(LLMParseError, match="Apenas 4"):
        _parse_suggestions(raw, table_names)


def test_parse_suggestions_rejects_technical_prefix():
    raw = json.dumps({
        "suggestions": [
            "Pergunta um?",
            "Pergunta dois?",
            "Pergunta três?",
            "Pergunta quatro?",
            "Quais gold_vendas?",
        ]
    })
    with pytest.raises(LLMParseError, match="Apenas 4"):
        _parse_suggestions(raw, set())


# ---------------------------------------------------------------------------
# generate_suggestions
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_suggestions_calls_llm_agent_with_correct_settings(monkeypatch):
    """Garante que generate_suggestions instancia LLMAgent com temperatura e max_tokens de sugestões."""

    captured: dict = {}

    class FakeLLMAgent:
        def __init__(self, system_prompt: str, temperature: float, max_tokens: int | None = None, model: str | None = None) -> None:
            captured["temperature"] = temperature
            captured["max_tokens"] = max_tokens
            captured["model"] = model

        async def run(self, question: str, validator=None):
            raw = '{"suggestions":["A?","B?","C?","D?","E?"]}'
            if validator is not None:
                validator(raw)
            return MagicMock(output=raw, tokens_used=42)

    monkeypatch.setattr(
        "vcommerce_ai_agent.llm.suggestions_generator.LLMAgent", FakeLLMAgent
    )

    suggestions, tokens = await generate_suggestions(
        "CREATE TABLE t (id INT);",
        history=_SAMPLE_HISTORY,
        model="gemini-test",
    )

    assert captured["temperature"] == config.LLM_TEMPERATURE_SUGGESTIONS
    assert captured["max_tokens"] == config.MAX_TOKENS_SUGGESTIONS
    assert captured["model"] == "gemini-test"
    assert suggestions == ["A?", "B?", "C?", "D?", "E?"]
    assert tokens == 42


@pytest.mark.asyncio
async def test_generate_suggestions_injects_history_into_prompt(monkeypatch):
    captured: dict = {}

    class FakeLLMAgent:
        def __init__(self, **kwargs):
            captured["system_prompt"] = kwargs["system_prompt"]

        async def run(self, question: str, validator=None):
            raw = '{"suggestions":["A?","B?","C?","D?","E?"]}'
            if validator is not None:
                validator(raw)
            return MagicMock(output=raw, tokens_used=42)

    monkeypatch.setattr(
        "vcommerce_ai_agent.llm.suggestions_generator.LLMAgent", FakeLLMAgent
    )

    await generate_suggestions(
        "CREATE TABLE t (id INT);",
        history=_SAMPLE_HISTORY,
    )

    assert "Quais os 10 produtos mais vendidos?" in captured["system_prompt"]
    assert "Os 10 produtos mais vendidos são..." in captured["system_prompt"]


@pytest.mark.asyncio
async def test_generate_suggestions_returns_tokens_when_none(monkeypatch):
    """Garante que tokens_used None é propagado corretamente."""

    class FakeLLMAgent:
        def __init__(self, **kwargs):
            pass

        async def run(self, question: str, validator=None):
            raw = '{"suggestions":["A?","B?","C?","D?","E?"]}'
            if validator is not None:
                validator(raw)
            return MagicMock(output=raw, tokens_used=None)

    monkeypatch.setattr(
        "vcommerce_ai_agent.llm.suggestions_generator.LLMAgent", FakeLLMAgent
    )

    suggestions, tokens = await generate_suggestions("CREATE TABLE t (id INT);")
    assert tokens is None
    assert len(suggestions) == SUGGESTIONS_COUNT


# ---------------------------------------------------------------------------
# INITIAL_SUGGESTIONS
# ---------------------------------------------------------------------------


def test_initial_suggestions_has_correct_count():
    assert len(INITIAL_SUGGESTIONS) == SUGGESTIONS_COUNT


def test_initial_suggestions_is_tuple():
    """A lista fixa é uma tupla imutável."""
    assert isinstance(INITIAL_SUGGESTIONS, tuple)
