"""
Módulo de geração de insight (Chamada 2).

Responsável por receber os dados brutos retornados pelo banco,
chamar o LLM (Gemini via PydanticAI) e produzir uma resposta
estruturada em JSON contendo apresentação textual e sugestão de gráfico.
"""

import json
import re
from pathlib import Path
from typing import Any

from vcommerce_ai_agent.core import config
from vcommerce_ai_agent.core.exceptions import LLMParseError
from vcommerce_ai_agent.llm.llm_client import LLMAgent

_PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "insight_system.txt"


def _load_system_prompt(
    question: str, data: list[dict[str, Any]], sql: str, history_text: str = ""
) -> str:
    """Carrega o template do system prompt e injeta as variáveis de contexto."""
    if not _PROMPT_PATH.exists():
        raise FileNotFoundError(f"Prompt não encontrado: {_PROMPT_PATH}")

    template = _PROMPT_PATH.read_text(encoding="utf-8")
    # Substituição simultânea para evitar colisão de placeholders (ex: question contendo "{sql}")
    replacements = {
        "{question}": question,
        "{sql}": sql,
        "{data}": json.dumps(data, ensure_ascii=False, indent=2),
        "{history}": history_text,
    }
    pattern = re.compile("|".join(re.escape(k) for k in replacements))
    template = pattern.sub(lambda m: replacements[m.group(0)], template)
    return template


def _extract_json_text(raw: str) -> str:
    """Extrai o trecho JSON de uma resposta possivelmente envelopada em markdown."""
    match = re.search(r"```json\s*(.*?)\s*```", raw, re.DOTALL | re.IGNORECASE)
    if not match:
        match = re.search(r"```\s*(.*?)\s*```", raw, re.DOTALL)
    text_to_parse = match.group(1).strip() if match else raw.strip()

    if text_to_parse.startswith("{"):
        return text_to_parse

    json_match = re.search(r"(\{.*\})", text_to_parse, re.DOTALL)
    if json_match:
        return json_match.group(1)
    return text_to_parse


def _parse_json(raw: str) -> dict[str, Any]:
    """
    Extrai e parseia o JSON da resposta do LLM.

    Levanta `LLMParseError` quando a resposta não é JSON válido, permitindo
    retry automático pelo cliente LLM.
    """
    text_to_parse = _extract_json_text(raw)
    try:
        parsed = json.loads(text_to_parse)
    except json.JSONDecodeError as exc:
        raise LLMParseError("A Chamada 2 retornou JSON malformado.") from exc

    if not isinstance(parsed, dict):
        raise LLMParseError("A Chamada 2 não retornou um objeto JSON.")

    return parsed


def _validate_insight_payload(raw: str) -> None:
    """Valida o contrato mínimo da apresentação retornada pela Chamada 2."""
    parsed = _parse_json(raw)

    activity = parsed.get("activity")
    if not isinstance(activity, str) or not activity.strip():
        raise LLMParseError("Campo obrigatório ausente ou inválido: activity.")

    answer_sections = parsed.get("answer_sections")
    if not isinstance(answer_sections, list):
        raise LLMParseError("Campo obrigatório ausente ou inválido: answer_sections.")
    for section in answer_sections:
        if not isinstance(section, dict):
            raise LLMParseError("Cada seção da resposta deve ser um objeto.")
        title = section.get("title")
        content = section.get("content")
        if not isinstance(title, str) or not title.strip():
            raise LLMParseError("Seção com título inválido.")
        if not isinstance(content, str) or not content.strip():
            raise LLMParseError("Seção com conteúdo inválido.")

    sources_summary = parsed.get("sources_summary")
    if sources_summary is not None:
        if not isinstance(sources_summary, dict):
            raise LLMParseError("Campo sources_summary deve ser objeto ou null.")
        text = sources_summary.get("text")
        if not isinstance(text, str) or not text.strip():
            raise LLMParseError("Campo sources_summary.text é obrigatório.")

    chart = parsed.get("chart")
    if chart is not None and not isinstance(chart, dict):
        raise LLMParseError("Campo chart deve ser objeto ou null.")


def _normalize_insight(parsed: dict[str, Any]) -> dict[str, Any]:
    """Normaliza campos opcionais e ignora dados devolvidos indevidamente pelo LLM."""
    return {
        "activity": parsed["activity"],
        "answer_sections": parsed["answer_sections"],
        "sources_summary": parsed.get("sources_summary"),
        "chart": parsed.get("chart"),
    }



def y_axis_has_numeric_values(
    y_axis: str | None, data: list[dict[str, Any]]
) -> bool:
    """y_axis ausente é aceito; presente exige >=1 valor int/float (não bool)."""
    if y_axis is None:
        return True
    for row in data:
        value = row.get(y_axis)
        if isinstance(value, bool):
            continue
        if isinstance(value, (int, float)):
            return True
    return False


def _validate_chart(insight: dict[str, Any], data: list[dict[str, Any]]) -> None:
    """
    Valida e, se necessário, anula a sugestão de gráfico.

    Regras:
        - type deve estar em ["bar", "line", "pie", "area"].
        - x_axis e y_axis devem corresponder a chaves presentes em `data`.
        - y_axis deve apontar para uma coluna numérica (int/float, não bool).
        - y_axis_format inválido é sanitizado para None (não invalida o chart).
    """
    chart = insight.get("chart")
    if not chart:
        return

    allowed_types = {"bar", "line", "pie", "area"}
    chart_type = chart.get("type")

    if chart_type not in allowed_types:
        insight["chart"] = None
        return

    if not data:
        insight["chart"] = None
        return

    # Garante que x_axis e y_axis existem nas chaves dos dados
    sample_keys = set(data[0].keys()) if data else set()
    x_axis = chart.get("x_axis")
    y_axis = chart.get("y_axis")

    if (x_axis is not None and x_axis not in sample_keys) or (
        y_axis is not None and y_axis not in sample_keys
    ):
        insight["chart"] = None
        return

    if not y_axis_has_numeric_values(y_axis, data):
        insight["chart"] = None
        return

    raw_format = chart.get("y_axis_format")
    if raw_format not in {"percent", "currency", "number", None}:
        chart["y_axis_format"] = None


_MAX_ROWS_FOR_INSIGHT_PROMPT = 100
"""Número máximo de linhas enviadas ao prompt da Chamada 2 para evitar estouro de context window."""


def format_history_for_insight(history: list[dict[str, str | None]] | None) -> str:
    """Formata o histórico de conversa para injeção no prompt da Chamada 2."""
    if not history:
        return ""

    lines = ["## Histórico da Conversa\n"]
    turn = 0
    for i in range(0, len(history), 2):
        if i + 1 >= len(history):
            break
        turn += 1
        user_msg = history[i]
        assistant_msg = history[i + 1]
        lines.append(f"Interação {turn}:")
        lines.append(f"Pergunta: {user_msg['content']}")
        lines.append(f"Resposta: {assistant_msg['content']}")
        lines.append("")

    lines.append(
        "Mantenha coerência com as respostas anteriores. "
        "Não repita informações já fornecidas, a menos que o usuário peça.\n"
    )
    return "\n".join(lines)


async def generate_insight(
    question: str,
    data: list[dict[str, Any]],
    sql: str,
    history: list[dict[str, str | None]] | None = None,
    model: str | None = None,
) -> tuple[dict[str, Any], int | None]:
    """
    Gera um insight estruturado a partir dos dados de uma consulta SQL.

    Args:
        question: Pergunta original do usuário em português.
        data: Lista de dicionários retornada pelo banco (pode ser vazia).
        sql: Query SQL que gerou os dados (para contexto no prompt).
        model: Identificador do modelo Gemini. Se None, usa o padrão.

    Returns:
        Tupla contendo o dicionário de insight e o número de tokens
        consumidos na chamada, quando disponível.

    Raises:
        FileNotFoundError: Se o arquivo de prompt não for encontrado.
        LLMError: Se a chamada ao LLM falhar.
    """
    # Trunca dados para o prompt a fim de preservar context window (P4)
    data_for_prompt = data[:_MAX_ROWS_FOR_INSIGHT_PROMPT]
    history_text = format_history_for_insight(history)
    system_prompt = _load_system_prompt(
        question, data_for_prompt, sql, history_text=history_text
    )

    agent = LLMAgent(
        system_prompt=system_prompt,
        temperature=config.LLM_TEMPERATURE_INSIGHT,
        max_tokens=config.MAX_TOKENS_INSIGHT,
        model=model,
    )

    result = await agent.run(question, validator=_validate_insight_payload)
    raw_output = result.output

    insight = _normalize_insight(_parse_json(raw_output))

    _validate_chart(insight, data)

    return insight, result.tokens_used
