"""
Módulo de geração de sugestões contextuais de perguntas.

Responsável por montar o prompt com o schema do banco e o histórico
da conversa, invocar o LLM (Gemini via PydanticAI) e extrair/validar
as perguntas sugeridas.
"""

import json
import re
from pathlib import Path

from vcommerce_ai_agent.core import config
from vcommerce_ai_agent.core.exceptions import LLMParseError
from vcommerce_ai_agent.llm.llm_client import LLMAgent

_PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "suggestions_system.txt"

SUGGESTIONS_COUNT = 5
INITIAL_SUGGESTIONS: tuple[str, ...] = (
    "Qual é a receita total agrupada por região do país?",
    "Quais são os principais clientes do segmento 'Campeão' que mais gastaram na loja?",
    "Qual é o tempo médio de resolução de tickets por tipo de problema?",
    "Quais são os 10 produtos com a melhor média de avaliação dos clientes?",
    "Quais canais de aquisição geram o maior número de compras e adições ao carrinho?",
)

_SQL_KEYWORDS = {"select", "from", "join", "where", "group by", "order by", "limit"}
_TECHNICAL_PREFIXES = (
    "dim_",
    "fato_",
    "fact_",
    "gold_",
    "silver_",
    "bronze_",
    "tbl_",
    "vw_",
)


def _format_history_for_suggestions(
    history: list[dict[str, str | None]] | None,
) -> str:
    """Formata o histórico de conversa para injeção no prompt de sugestões."""
    if not history:
        return "Nenhuma interação anterior nesta conversa."

    lines: list[str] = []
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
        "Gere perguntas de follow-up que aprofundem ou complementem "
        "os temas já discutidos acima. Não repita perguntas já feitas."
    )
    return "\n".join(lines)


def _load_system_prompt(
    schema: str,
    history: list[dict[str, str | None]] | None = None,
) -> str:
    """Carrega o template do system prompt e injeta o schema e o histórico."""
    if not _PROMPT_PATH.exists():
        raise FileNotFoundError(f"Prompt não encontrado: {_PROMPT_PATH}")
    template = _PROMPT_PATH.read_text(encoding="utf-8")
    return (
        template
        .replace("{schema}", schema)
        .replace("{history}", _format_history_for_suggestions(history))
    )


def _extract_table_names(schema: str) -> set[str]:
    """Extrai nomes físicos de tabelas a partir dos CREATE TABLE do schema."""
    return set(re.findall(r"CREATE TABLE\s+(\w+)", schema, re.IGNORECASE))


def _contains_markdown(text: str) -> bool:
    """Verifica se o texto contém blocos markdown ou crases de código."""
    return "```" in text or text.count("`") >= 2


def _contains_sql_keyword(text: str) -> bool:
    """Verifica se o texto contém palavras SQL obvias."""
    lower = text.lower()
    for keyword in _SQL_KEYWORDS:
        if keyword in lower:
            return True
    return False


def _contains_technical_prefix(text: str) -> bool:
    """Verifica se o texto contém prefixos técnicos de tabelas."""
    lower = text.lower()
    for prefix in _TECHNICAL_PREFIXES:
        if prefix in lower:
            return True
    return False


def _contains_physical_table_name(text: str, table_names: set[str]) -> bool:
    """Verifica se o texto contém nomes físicos de tabelas extraídos do schema."""
    lower = text.lower()
    for name in table_names:
        if name.lower() in lower:
            return True
    return False


def _normalize_suggestion(text: str) -> str:
    """Normaliza pergunta para comparação de duplicatas."""
    return " ".join(text.strip().lower().split())


def _parse_suggestions(
    raw: str,
    table_names: set[str],
) -> list[str]:
    """
    Faz o parse e a validação da resposta JSON do LLM.

    Raises:
        LLMParseError: Se a resposta não seguir o contrato esperado.
    """
    raw = raw.strip()

    # Remove possível markdown envelopando o JSON
    if raw.startswith("```"):
        match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
        if match:
            raw = match.group(1).strip()

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise LLMParseError(
            "A resposta do LLM não continha um JSON válido. Tentando novamente..."
        ) from exc

    if not isinstance(payload, dict):
        raise LLMParseError("A resposta do LLM não é um objeto JSON.")

    suggestions = payload.get("suggestions")
    if suggestions is None:
        raise LLMParseError("Campo 'suggestions' ausente no JSON retornado.")

    if not isinstance(suggestions, list):
        raise LLMParseError("O campo 'suggestions' deve ser uma lista.")

    valid: list[str] = []
    seen: set[str] = set()

    for item in suggestions:
        if not isinstance(item, str):
            continue
        item = item.strip()
        if not item:
            continue
        if not item.endswith("?"):
            continue
        if _contains_markdown(item):
            continue
        if _contains_sql_keyword(item):
            continue
        if _contains_technical_prefix(item):
            continue
        if _contains_physical_table_name(item, table_names):
            continue
        lower_item = _normalize_suggestion(item)
        if lower_item in seen:
            continue
        seen.add(lower_item)
        valid.append(item)

    if len(valid) < SUGGESTIONS_COUNT:
        raise LLMParseError(
            f"Apenas {len(valid)} perguntas válidas encontradas. "
            f"São necessárias exatamente {SUGGESTIONS_COUNT}."
        )

    return valid[:SUGGESTIONS_COUNT]


async def generate_suggestions(
    schema: str,
    history: list[dict[str, str | None]] | None = None,
    model: str | None = None,
) -> tuple[list[str], int | None]:
    """
    Gera 5 perguntas contextuais a partir do schema e do histórico da conversa.

    Args:
        schema: Schema completo do banco formatado como texto.
        history: Histórico da conversa para contextualizar as sugestões.
        model: Identificador do modelo Gemini. Se None, usa o padrão.

    Returns:
        Tupla contendo a lista de perguntas sugeridas e o número de
        tokens consumidos na chamada, quando disponível.

    Raises:
        FileNotFoundError: Se o arquivo de prompt não for encontrado.
        LLMParseError: Se a resposta do LLM não puder ser parseada ou validada.
        LLMError: Se a chamada ao LLM falhar.
    """
    system_prompt = _load_system_prompt(schema, history)
    table_names = _extract_table_names(schema)

    agent = LLMAgent(
        system_prompt=system_prompt,
        temperature=config.LLM_TEMPERATURE_SUGGESTIONS,
        max_tokens=config.MAX_TOKENS_SUGGESTIONS,
        model=model,
    )

    suggestions: list[str] = []

    def _validator(raw: str) -> None:
        nonlocal suggestions
        suggestions = _parse_suggestions(raw, table_names)

    result = await agent.run(
        "Gere 5 perguntas de follow-up úteis para continuar a conversa.",
        validator=_validator,
    )

    return suggestions, result.tokens_used
