"""
Módulo de geração de insight (Chamada 2).

Responsável por receber os dados brutos retornados pelo banco,
chamar o LLM (Gemini via PydanticAI) e produzir uma resposta
estruturada em JSON contendo insight textual, dados tabulares e
sugestão de gráfico.
"""

import json
import re
from pathlib import Path
from typing import Any

from src.core import config
from src.llm.llm_client import LLMAgent

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


def _parse_json(raw: str) -> dict[str, Any]:
    """
    Extrai e parseia o JSON da resposta do LLM.

    Tenta primeiro encontrar um bloco ```json ... ```;
    caso contrário, faz parsing do texto completo.
    Se ambos falharem, retorna um fallback com o texto bruto.
    """
    # Tenta bloco markdown com tag json
    match = re.search(r"```json\s*(.*?)\s*```", raw, re.DOTALL | re.IGNORECASE)
    if not match:
        # Tenta bloco markdown sem tag de linguagem
        match = re.search(r"```\s*(.*?)\s*```", raw, re.DOTALL)
    text_to_parse = match.group(1).strip() if match else raw.strip()

    # Se ainda não for JSON válido, tenta extrair entre primeira '{' e última '}'
    try:
        parsed = json.loads(text_to_parse)
    except json.JSONDecodeError:
        json_match = re.search(r"(\{.*\})", text_to_parse, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group(1))
            except json.JSONDecodeError:
                parsed = None
        else:
            parsed = None

    if parsed is None:
        # Fallback gracioso: retorna o texto bruto como insight
        return {
            "text": raw.strip(),
            "data": None,
            "chart": None,
        }

    # Garante presença da chave obrigatória; se ausente, retorna fallback
    if "text" not in parsed:
        return {
            "text": raw.strip(),
            "data": None,
            "chart": None,
        }

    return parsed


def _validate_chart(insight: dict[str, Any], data: list[dict[str, Any]]) -> None:
    """
    Valida e, se necessário, anula a sugestão de gráfico.

    Regras:
        - type deve estar em ["bar", "line", "pie", "area"].
        - x_axis e y_axis devem corresponder a chaves presentes em `data`.
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
) -> dict[str, Any]:
    """
    Gera um insight estruturado a partir dos dados de uma consulta SQL.

    Args:
        question: Pergunta original do usuário em português.
        data: Lista de dicionários retornada pelo banco (pode ser vazia).
        sql: Query SQL que gerou os dados (para contexto no prompt).
        model: Identificador do modelo Gemini. Se None, usa o padrão.

    Returns:
        Dicionário com estrutura {"text": str, "data": list[dict] | None, "chart": dict | None}.

    Raises:
        FileNotFoundError: Se o arquivo de prompt não for encontrado.
        LLMError: Se a chamada ao LLM falhar.
    """
    # Edge case: dados vazios — deixa o LLM contextualizar no prompt
    is_empty = not data

    is_scalar = len(data) == 1 and len(data[0]) == 1

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

    raw_output = await agent.run(question)

    insight = _parse_json(raw_output)

    if is_empty:
        # Quando não há dados, força data/chart como None e preserva o texto do LLM
        insight["data"] = None
        insight["chart"] = None
    elif is_scalar:
        insight["data"] = None
        insight["chart"] = None
    else:
        # Garante que o campo data do insight seja consistente com os dados brutos
        if insight.get("data") is None and data:
            insight["data"] = data
        _validate_chart(insight, insight.get("data") or [])

    return insight
