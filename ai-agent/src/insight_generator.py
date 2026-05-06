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

from src import config
from src.exceptions import LLMError
from src.llm_client import LLMAgent

_PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "insight_system.txt"


def _load_system_prompt(question: str, data: list[dict[str, Any]], sql: str) -> str:
    """Carrega o template do system prompt e injeta as variáveis de contexto."""
    if not _PROMPT_PATH.exists():
        raise FileNotFoundError(f"Prompt não encontrado: {_PROMPT_PATH}")

    template = _PROMPT_PATH.read_text(encoding="utf-8")
    template = template.replace("{question}", question)
    template = template.replace("{sql}", sql)
    # Serializa os dados como JSON indentado para o prompt
    template = template.replace("{data}", json.dumps(data, ensure_ascii=False, indent=2))
    return template


def _parse_json(raw: str) -> dict[str, Any]:
    """
    Extrai e parseia o JSON da resposta do LLM.

    Tenta primeiro encontrar um bloco ```json ... ```;
    caso contrário, faz parsing do texto completo.
    Se ambos falharem, retorna um fallback com o texto bruto.
    """
    # Tenta bloco markdown
    pattern = r"```json\s*(.*?)\s*```"
    match = re.search(pattern, raw, re.DOTALL | re.IGNORECASE)
    text_to_parse = match.group(1).strip() if match else raw.strip()

    try:
        return json.loads(text_to_parse)  # type: ignore[no-any-return]
    except json.JSONDecodeError:
        # Fallback gracioso: retorna o texto bruto como insight
        return {
            "text": raw.strip(),
            "data": None,
            "chart": None,
        }


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


async def generate_insight(
    question: str, data: list[dict[str, Any]], sql: str
) -> dict[str, Any]:
    """
    Gera um insight estruturado a partir dos dados de uma consulta SQL.

    Args:
        question: Pergunta original do usuário em português.
        data: Lista de dicionários retornada pelo banco (pode ser vazia).
        sql: Query SQL que gerou os dados (para contexto no prompt).

    Returns:
        Dicionário com estrutura {"text": str, "data": list[dict] | None, "chart": dict | None}.

    Raises:
        FileNotFoundError: Se o arquivo de prompt não for encontrado.
        LLMError: Se a chamada ao LLM falhar.
    """
    # Edge case: dados vazios
    if not data:
        return {
            "text": "Não foram encontrados resultados para essa consulta.",
            "data": None,
            "chart": None,
        }

    # Edge case: valor único escalar (1 linha × 1 coluna)
    if len(data) == 1 and len(data[0]) == 1:
        system_prompt = _load_system_prompt(question, data, sql)
        agent = LLMAgent(
            system_prompt=system_prompt,
            temperature=config.LLM_TEMPERATURE_INSIGHT,
        )
        try:
            raw_output = await agent.run(question)
        except RuntimeError as exc:
            raise LLMError(f"Falha na geração do insight: {exc}") from exc

        insight = _parse_json(raw_output)
        # Força data e chart como None para valor escalar
        insight["data"] = None
        insight["chart"] = None
        return insight

    # Caso geral: dados tabulares
    system_prompt = _load_system_prompt(question, data, sql)
    agent = LLMAgent(
        system_prompt=system_prompt,
        temperature=config.LLM_TEMPERATURE_INSIGHT,
    )

    try:
        raw_output = await agent.run(question)
    except RuntimeError as exc:
        raise LLMError(f"Falha na geração do insight: {exc}") from exc

    insight = _parse_json(raw_output)

    # Garante que o campo data do insight seja consistente com os dados brutos
    # (se o LLM retornou data=None mas temos dados, mantemos os dados brutos)
    if insight.get("data") is None and data:
        insight["data"] = data

    _validate_chart(insight, data)
    return insight
