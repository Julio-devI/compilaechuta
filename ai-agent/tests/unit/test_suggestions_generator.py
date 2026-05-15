"""
Testes unitários para o módulo de geração de sugestões iniciais.

Cobrem o parser de JSON, validação das perguntas e integração
com o cliente LLM.
"""

import json
from unittest.mock import MagicMock

import pytest

from vcommerce_ai_agent.core import config
from vcommerce_ai_agent.core.exceptions import LLMParseError
from vcommerce_ai_agent.llm.suggestions_generator import (
    FALLBACK_SUGGESTIONS,
    SUGGESTIONS_COUNT,
    _contains_markdown,
    _contains_physical_table_name,
    _contains_sql_keyword,
    _contains_technical_prefix,
    _extract_table_names,
    _format_previous_suggestions,
    _normalize_previous_suggestions,
    _parse_suggestions,
    generate_suggestions,
    select_fallback_suggestions,
)


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


def test_normalize_previous_suggestions_removes_empty_and_duplicate_items():
    previous = [
        " Qual é a receita total agrupada por região do país? ",
        "",
        "qual é a receita total agrupada por região do país?",
        "Quais produtos têm melhor avaliação?",
        123,
    ]

    result = _normalize_previous_suggestions(previous)

    assert result == [
        "Qual é a receita total agrupada por região do país?",
        "Quais produtos têm melhor avaliação?",
    ]


def test_format_previous_suggestions_returns_instruction_list():
    result = _format_previous_suggestions(["Pergunta anterior?"])

    assert "Pergunta anterior?" in result
    assert "Não repita" in result


def test_select_fallback_suggestions_avoids_previous_suggestions():
    result = select_fallback_suggestions(list(FALLBACK_SUGGESTIONS))

    assert len(result) == SUGGESTIONS_COUNT
    assert not set(result).intersection(FALLBACK_SUGGESTIONS)


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


def test_parse_suggestions_rejects_previous_suggestions():
    previous = ["Pergunta um?"]
    raw = json.dumps({
        "suggestions": [
            "Pergunta um?",
            "Pergunta dois?",
            "Pergunta três?",
            "Pergunta quatro?",
            "Pergunta cinco?",
        ]
    })

    with pytest.raises(LLMParseError, match="Apenas 4"):
        _parse_suggestions(raw, set(), previous_suggestions=previous)


def test_parse_suggestions_accepts_replacements_for_previous_suggestions():
    previous = ["Pergunta um?"]
    raw = json.dumps({
        "suggestions": [
            "Pergunta dois?",
            "Pergunta três?",
            "Pergunta quatro?",
            "Pergunta cinco?",
            "Pergunta seis?",
        ]
    })

    result = _parse_suggestions(raw, set(), previous_suggestions=previous)

    assert result == [
        "Pergunta dois?",
        "Pergunta três?",
        "Pergunta quatro?",
        "Pergunta cinco?",
        "Pergunta seis?",
    ]


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
            return MagicMock(output='{"suggestions":["A?","B?","C?","D?","E?"]}', tokens_used=42)

    monkeypatch.setattr(
        "vcommerce_ai_agent.llm.suggestions_generator.LLMAgent", FakeLLMAgent
    )

    suggestions, tokens = await generate_suggestions("CREATE TABLE t (id INT);", model="gemini-test")

    assert captured["temperature"] == config.LLM_TEMPERATURE_SUGGESTIONS
    assert captured["max_tokens"] == config.MAX_TOKENS_SUGGESTIONS
    assert captured["model"] == "gemini-test"
    assert suggestions == ["A?", "B?", "C?", "D?", "E?"]
    assert tokens == 42


@pytest.mark.asyncio
async def test_generate_suggestions_injects_previous_suggestions_into_prompt(
    monkeypatch,
):
    captured: dict = {}

    class FakeLLMAgent:
        def __init__(self, **kwargs):
            captured["system_prompt"] = kwargs["system_prompt"]

        async def run(self, question: str, validator=None):
            return MagicMock(
                output='{"suggestions":["A?","B?","C?","D?","E?"]}',
                tokens_used=42,
            )

    monkeypatch.setattr(
        "vcommerce_ai_agent.llm.suggestions_generator.LLMAgent", FakeLLMAgent
    )

    await generate_suggestions(
        "CREATE TABLE t (id INT);",
        previous_suggestions=["Pergunta anterior?"],
    )

    assert "Pergunta anterior?" in captured["system_prompt"]


@pytest.mark.asyncio
async def test_generate_suggestions_returns_tokens_when_none(monkeypatch):
    """Garante que tokens_used None é propagado corretamente."""

    class FakeLLMAgent:
        def __init__(self, **kwargs):
            pass

        async def run(self, question: str, validator=None):
            return MagicMock(output='{"suggestions":["A?","B?","C?","D?","E?"]}', tokens_used=None)

    monkeypatch.setattr(
        "vcommerce_ai_agent.llm.suggestions_generator.LLMAgent", FakeLLMAgent
    )

    suggestions, tokens = await generate_suggestions("CREATE TABLE t (id INT);")
    assert tokens is None
    assert len(suggestions) == SUGGESTIONS_COUNT
