"""
Testes unitários dedicados para o módulo insight_generator (Chamada 2).

Cobrem parsing de JSON, validação de payload, normalização,
sugestão de gráfico e formatação de histórico de forma isolada
do contrato da facade do agente.
"""

import json
from pathlib import Path

import pytest

from vcommerce_ai_agent.core.exceptions import LLMParseError
from vcommerce_ai_agent.llm import insight_generator
from vcommerce_ai_agent.llm.insight_generator import (
    _extract_json_text,
    _load_system_prompt,
    _normalize_insight,
    _parse_json,
    _validate_chart,
    _validate_insight_payload,
    format_history_for_insight,
    generate_insight,
)
from vcommerce_ai_agent.llm.llm_client import LLMRunResult


# ---------------------------------------------------------------------------
# _extract_json_text
# ---------------------------------------------------------------------------


def test_extract_json_text_pure_json():
    raw = '{"activity": "ok"}'
    assert _extract_json_text(raw) == '{"activity": "ok"}'


def test_extract_json_text_markdown_json():
    raw = '```json\n{"activity": "ok"}\n```'
    assert _extract_json_text(raw) == '{"activity": "ok"}'


def test_extract_json_text_markdown_generic():
    raw = '```\n{"activity": "ok"}\n```'
    assert _extract_json_text(raw) == '{"activity": "ok"}'


def test_extract_json_text_with_surrounding_text():
    raw = 'Claro! Aqui está:\n```json\n{"activity": "ok"}\n```\nEspero que ajude.'
    assert _extract_json_text(raw) == '{"activity": "ok"}'


def test_extract_json_text_no_markdown():
    raw = 'Aqui vai: {"activity": "ok"} e mais texto'
    assert _extract_json_text(raw) == '{"activity": "ok"}'


def test_extract_json_text_no_json_returns_stripped():
    raw = 'Apenas texto sem JSON válido'
    assert _extract_json_text(raw) == 'Apenas texto sem JSON válido'


# ---------------------------------------------------------------------------
# _parse_json
# ---------------------------------------------------------------------------


def test_parse_json_valid_dict():
    result = _parse_json('{"activity": "ok"}')
    assert result == {"activity": "ok"}


def test_parse_json_malformed_raises():
    with pytest.raises(LLMParseError) as exc_info:
        _parse_json('{"activity": "ok"')
    assert "malformado" in str(exc_info.value).lower()


def test_parse_json_not_a_dict_raises():
    with pytest.raises(LLMParseError) as exc_info:
        _parse_json('["activity", "ok"]')
    assert "objeto JSON" in str(exc_info.value)


# ---------------------------------------------------------------------------
# _validate_insight_payload
# ---------------------------------------------------------------------------


def _valid_payload():
    return {
        "activity": "Análise realizada.",
        "answer_sections": [
            {"title": "Resultado", "content": "10 clientes."}
        ],
        "sources_summary": {"text": "Fonte: dim_cliente."},
        "chart": None,
    }


def test_validate_insight_payload_accepts_valid():
    raw = json.dumps(_valid_payload())
    # Não deve levantar exceção
    _validate_insight_payload(raw)


def test_validate_insight_payload_missing_activity():
    payload = _valid_payload()
    del payload["activity"]
    with pytest.raises(LLMParseError) as exc_info:
        _validate_insight_payload(json.dumps(payload))
    assert "activity" in str(exc_info.value)


def test_validate_insight_payload_empty_activity():
    payload = _valid_payload()
    payload["activity"] = "   "
    with pytest.raises(LLMParseError) as exc_info:
        _validate_insight_payload(json.dumps(payload))
    assert "activity" in str(exc_info.value)


def test_validate_insight_payload_missing_answer_sections():
    payload = _valid_payload()
    del payload["answer_sections"]
    with pytest.raises(LLMParseError) as exc_info:
        _validate_insight_payload(json.dumps(payload))
    assert "answer_sections" in str(exc_info.value)


def test_validate_insight_payload_answer_sections_not_list():
    payload = _valid_payload()
    payload["answer_sections"] = {"title": "Resultado", "content": "x"}
    with pytest.raises(LLMParseError) as exc_info:
        _validate_insight_payload(json.dumps(payload))
    assert "answer_sections" in str(exc_info.value)


def test_validate_insight_payload_section_missing_title():
    payload = _valid_payload()
    payload["answer_sections"] = [{"content": "x"}]
    with pytest.raises(LLMParseError) as exc_info:
        _validate_insight_payload(json.dumps(payload))
    assert "título" in str(exc_info.value)


def test_validate_insight_payload_section_missing_content():
    payload = _valid_payload()
    payload["answer_sections"] = [{"title": "x"}]
    with pytest.raises(LLMParseError) as exc_info:
        _validate_insight_payload(json.dumps(payload))
    assert "conteúdo" in str(exc_info.value)


def test_validate_insight_payload_invalid_sources_summary_type():
    payload = _valid_payload()
    payload["sources_summary"] = "texto"
    with pytest.raises(LLMParseError) as exc_info:
        _validate_insight_payload(json.dumps(payload))
    assert "sources_summary" in str(exc_info.value)


def test_validate_insight_payload_sources_summary_missing_text():
    payload = _valid_payload()
    payload["sources_summary"] = {}
    with pytest.raises(LLMParseError) as exc_info:
        _validate_insight_payload(json.dumps(payload))
    assert "sources_summary.text" in str(exc_info.value)


def test_validate_insight_payload_invalid_chart_type():
    payload = _valid_payload()
    payload["chart"] = "bar"
    with pytest.raises(LLMParseError) as exc_info:
        _validate_insight_payload(json.dumps(payload))
    assert "chart" in str(exc_info.value)


# ---------------------------------------------------------------------------
# _normalize_insight
# ---------------------------------------------------------------------------


def test_normalize_insight_ignores_extra_fields():
    parsed = {
        "activity": "ok",
        "answer_sections": [],
        "sources_summary": None,
        "chart": None,
        "data": [{"total": 999}],
        "sql": "SELECT 1",
    }
    result = _normalize_insight(parsed)
    assert "data" not in result
    assert "sql" not in result
    assert result["activity"] == "ok"


# ---------------------------------------------------------------------------
# _validate_chart
# ---------------------------------------------------------------------------


def test_validate_chart_valid():
    insight = {
        "chart": {
            "type": "bar",
            "x_axis": "produto",
            "y_axis": "total",
            "title": "Vendas",
        }
    }
    _validate_chart(insight, [{"produto": "A", "total": 10}])
    assert insight["chart"] is not None


def test_validate_chart_null_unchanged():
    insight = {"chart": None}
    _validate_chart(insight, [{"total": 10}])
    assert insight["chart"] is None


def test_validate_chart_invalid_type_nulled():
    insight = {"chart": {"type": "donut", "x_axis": "a", "y_axis": "b"}}
    _validate_chart(insight, [{"a": 1, "b": 2}])
    assert insight["chart"] is None


def test_validate_chart_missing_x_axis_in_data_nulled():
    insight = {"chart": {"type": "line", "x_axis": "mes", "y_axis": "total"}}
    _validate_chart(insight, [{"total": 10}])
    assert insight["chart"] is None


def test_validate_chart_missing_y_axis_in_data_nulled():
    insight = {"chart": {"type": "line", "x_axis": "mes", "y_axis": "total"}}
    _validate_chart(insight, [{"mes": "jan"}])
    assert insight["chart"] is None


def test_validate_chart_empty_data_nulled():
    insight = {"chart": {"type": "pie", "x_axis": "a", "y_axis": "b"}}
    _validate_chart(insight, [])
    assert insight["chart"] is None


def test_validate_chart_both_axes_none():
    insight = {"chart": {"type": "pie", "x_axis": None, "y_axis": None}}
    _validate_chart(insight, [{"total": 10}])
    assert insight["chart"] is not None


# ---------------------------------------------------------------------------
# format_history_for_insight
# ---------------------------------------------------------------------------


def test_format_history_empty_none():
    assert format_history_for_insight(None) == ""


def test_format_history_empty_list():
    assert format_history_for_insight([]) == ""


def test_format_history_single_pair():
    history = [
        {"content": "Pergunta 1"},
        {"content": "Resposta 1"},
    ]
    result = format_history_for_insight(history)
    assert "Interação 1:" in result
    assert "Pergunta: Pergunta 1" in result
    assert "Resposta: Resposta 1" in result


def test_format_history_multiple_pairs():
    history = [
        {"content": "P1"},
        {"content": "R1"},
        {"content": "P2"},
        {"content": "R2"},
    ]
    result = format_history_for_insight(history)
    assert "Interação 1:" in result
    assert "Interação 2:" in result


def test_format_history_odd_length_ignores_last():
    history = [
        {"content": "P1"},
        {"content": "R1"},
        {"content": "P2"},
    ]
    result = format_history_for_insight(history)
    assert "Interação 1:" in result
    assert "Interação 2:" not in result


# ---------------------------------------------------------------------------
# _load_system_prompt
# ---------------------------------------------------------------------------


def test_load_system_prompt_replaces_placeholders(tmp_path, monkeypatch):
    prompt_file = tmp_path / "insight_system.txt"
    prompt_file.write_text(
        "Pergunta: {question}\nSQL: {sql}\nDados: {data}\nHistórico: {history}",
        encoding="utf-8",
    )
    monkeypatch.setattr(
        insight_generator, "_PROMPT_PATH", prompt_file
    )
    result = _load_system_prompt(
        question="Q", data=[{"a": 1}], sql="SELECT 1", history_text="H"
    )
    assert "Pergunta: Q" in result
    assert "SQL: SELECT 1" in result
    assert '"a": 1' in result
    assert "Histórico: H" in result


def test_load_system_prompt_missing_file_raises(monkeypatch):
    monkeypatch.setattr(
        insight_generator, "_PROMPT_PATH", Path("/nonexistent/prompt.txt")
    )
    with pytest.raises(FileNotFoundError):
        _load_system_prompt("Q", [], "SELECT 1")


# ---------------------------------------------------------------------------
# generate_insight (integração mockada)
# ---------------------------------------------------------------------------


class FakeLLMAgent:
    """Agente falso para testar generate_insight sem chamar API real."""

    def __init__(self, system_prompt: str, temperature: float, max_tokens=None, model=None):
        self.system_prompt = system_prompt
        self.temperature = temperature

    async def run(self, question: str, validator=None):
        raw = (
            '{"activity": "Analisei.", '
            '"answer_sections": [{"title": "T", "content": "C"}], '
            '"sources_summary": {"text": "Fonte."}, '
            '"chart": null}'
        )
        if validator:
            validator(raw)
        return LLMRunResult(output=raw, tokens_used=7)


@pytest.mark.asyncio
async def test_generate_insight_returns_parsed_result(monkeypatch):
    monkeypatch.setattr(insight_generator, "LLMAgent", FakeLLMAgent)

    result, tokens = await generate_insight(
        question="Q", data=[{"total": 10}], sql="SELECT 1"
    )

    assert result["activity"] == "Analisei."
    assert result["answer_sections"] == [{"title": "T", "content": "C"}]
    assert result["sources_summary"] == {"text": "Fonte."}
    assert result["chart"] is None
    assert tokens == 7


@pytest.mark.asyncio
async def test_generate_insight_truncates_data_for_prompt(monkeypatch):
    monkeypatch.setattr(insight_generator, "LLMAgent", FakeLLMAgent)
    large_data = [{"id": i} for i in range(150)]

    captured_prompt = None

    original_load = _load_system_prompt

    def mock_load(question, data, sql, history_text=""):
        nonlocal captured_prompt
        captured_prompt = data
        return original_load(question, data, sql, history_text)

    monkeypatch.setattr(insight_generator, "_load_system_prompt", mock_load)

    await generate_insight(question="Q", data=large_data, sql="SELECT 1")

    assert captured_prompt is not None
    assert len(captured_prompt) == 100


@pytest.mark.asyncio
async def test_generate_insight_preserves_chart_when_valid(monkeypatch):
    class FakeLLMAgentWithChart(FakeLLMAgent):
        async def run(self, question: str, validator=None):
            raw = (
                '{"activity": "A", '
                '"answer_sections": [{"title": "T", "content": "C"}], '
                '"sources_summary": null, '
                '"chart": {"type": "bar", "x_axis": "mes", "y_axis": "total", "title": "T"}}'
            )
            if validator:
                validator(raw)
            return LLMRunResult(output=raw, tokens_used=3)

    monkeypatch.setattr(insight_generator, "LLMAgent", FakeLLMAgentWithChart)

    result, tokens = await generate_insight(
        question="Q", data=[{"mes": "jan", "total": 10}], sql="SELECT 1"
    )

    assert result["chart"] == {
        "type": "bar",
        "x_axis": "mes",
        "y_axis": "total",
        "title": "T",
    }


@pytest.mark.asyncio
async def test_generate_insight_discards_invalid_chart(monkeypatch):
    class FakeLLMAgentWithBadChart(FakeLLMAgent):
        async def run(self, question: str, validator=None):
            raw = (
                '{"activity": "A", '
                '"answer_sections": [{"title": "T", "content": "C"}], '
                '"sources_summary": null, '
                '"chart": {"type": "bar", "x_axis": "inexistente", "y_axis": "total", "title": "T"}}'
            )
            if validator:
                validator(raw)
            return LLMRunResult(output=raw, tokens_used=3)

    monkeypatch.setattr(insight_generator, "LLMAgent", FakeLLMAgentWithBadChart)

    result, _ = await generate_insight(
        question="Q", data=[{"mes": "jan", "total": 10}], sql="SELECT 1"
    )

    assert result["chart"] is None
