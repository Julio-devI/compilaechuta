"""
Módulo de geração de sugestões iniciais de perguntas.

Responsável por montar o prompt com o schema do banco, invocar o LLM
(Gemini via PydanticAI) e extrair/validar as perguntas sugeridas.
"""

import json
import re
from pathlib import Path

from vcommerce_ai_agent.core import config
from vcommerce_ai_agent.core.exceptions import LLMParseError
from vcommerce_ai_agent.llm.llm_client import LLMAgent

_PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "suggestions_system.txt"

SUGGESTIONS_COUNT = 5
FALLBACK_SUGGESTIONS = (
    "Qual é a receita total agrupada por região do país?",
    "Quais são os principais clientes do segmento 'Campeões' que mais gastaram na loja?",
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


FALLBACK_SUGGESTION_POOL = (
    *FALLBACK_SUGGESTIONS,
    "Quais foram os 10 produtos com maior receita total gerada?",
    "Qual foi o método de pagamento mais utilizado nas vendas?",
    "Qual é o ticket médio das vendas separadas por categoria de produto?",
    "Quantos pedidos foram cancelados ou estão pendentes?",
    "Quais produtos estão com estoque zerado e precisam de revisão?",
    "Quais são os 5 fornecedores com a maior quantidade de unidades vendidas?",
    "Quantos pedidos em média um cliente da região Nordeste realiza?",
    "Qual a distribuição percentual de clientes por segmento RFM?",
    "Quais agentes de suporte possuem a melhor nota média de satisfação?",
    "Quais clientes possuem o maior número de tickets de suporte?",
    "Qual é a proporção de avaliações NPS classificadas como 'Promotores'?",
    "Quais os comentários das avaliações de pedidos com nota baixa (1 ou 2)?",
    "Qual é o dispositivo de navegação mais utilizado pelos clientes?",
    "Qual é a taxa de abandono de carrinho média por canal de aquisição?",
    "Como as notas de avaliação do suporte variam de acordo com o tempo de resolução do ticket?",
)


def _normalize_suggestion(text: str) -> str:
    """Normaliza pergunta para comparação de repetição."""
    return " ".join(text.strip().lower().split())


def _normalize_previous_suggestions(
    previous_suggestions: list[str] | None,
) -> list[str]:
    """Normaliza lista opcional de perguntas já sugeridas."""
    if previous_suggestions is None:
        return []
    if not isinstance(previous_suggestions, list):
        raise ValueError("previous_suggestions deve ser uma lista de strings.")

    normalized: list[str] = []
    seen: set[str] = set()
    for item in previous_suggestions:
        if not isinstance(item, str):
            continue
        suggestion = item.strip()
        if not suggestion:
            continue
        key = _normalize_suggestion(suggestion)
        if key in seen:
            continue
        seen.add(key)
        normalized.append(suggestion)
    return normalized


def _format_previous_suggestions(previous_suggestions: list[str] | None) -> str:
    """Formata perguntas anteriores para o prompt de sugestões."""
    normalized = _normalize_previous_suggestions(previous_suggestions)
    if not normalized:
        return "Nenhuma pergunta anterior foi informada."
    lines = [
        "As perguntas abaixo já foram sugeridas ao usuário. "
        "Não repita nenhuma delas, nem variações quase idênticas:"
    ]
    lines.extend(f"- {suggestion}" for suggestion in normalized)
    return "\n".join(lines)


def select_fallback_suggestions(
    previous_suggestions: list[str] | None = None,
) -> list[str]:
    """Seleciona 5 perguntas de fallback evitando perguntas anteriores."""
    previous = {
        _normalize_suggestion(suggestion)
        for suggestion in _normalize_previous_suggestions(previous_suggestions)
    }
    selected = [
        suggestion
        for suggestion in FALLBACK_SUGGESTION_POOL
        if _normalize_suggestion(suggestion) not in previous
    ]
    if len(selected) >= SUGGESTIONS_COUNT:
        return selected[:SUGGESTIONS_COUNT]
    return list(FALLBACK_SUGGESTIONS)


def _load_system_prompt(
    schema: str,
    previous_suggestions: list[str] | None = None,
) -> str:
    """Carrega o template do system prompt e injeta o schema dinâmico."""
    if not _PROMPT_PATH.exists():
        raise FileNotFoundError(f"Prompt não encontrado: {_PROMPT_PATH}")
    template = _PROMPT_PATH.read_text(encoding="utf-8")
    return (
        template
        .replace("{schema}", schema)
        .replace(
            "{previous_suggestions}",
            _format_previous_suggestions(previous_suggestions),
        )
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


def _parse_suggestions(
    raw: str,
    table_names: set[str],
    previous_suggestions: list[str] | None = None,
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

    previous = {
        _normalize_suggestion(suggestion)
        for suggestion in _normalize_previous_suggestions(previous_suggestions)
    }
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
        if lower_item in previous:
            continue
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
    previous_suggestions: list[str] | None = None,
    model: str | None = None,
) -> tuple[list[str], int | None]:
    """
    Gera 5 perguntas de exemplo dinâmicas a partir do schema do banco.

    Args:
        schema: Schema completo do banco formatado como texto.
        previous_suggestions: Perguntas já sugeridas ao usuário nesta sessão.
        model: Identificador do modelo Gemini. Se None, usa o padrão.

    Returns:
        Tupla contendo a lista de perguntas sugeridas e o número de
        tokens consumidos na chamada, quando disponível.

    Raises:
        FileNotFoundError: Se o arquivo de prompt não for encontrado.
        LLMParseError: Se a resposta do LLM não puder ser parseada ou validada.
        LLMError: Se a chamada ao LLM falhar.
    """
    system_prompt = _load_system_prompt(schema, previous_suggestions)
    table_names = _extract_table_names(schema)

    agent = LLMAgent(
        system_prompt=system_prompt,
        temperature=config.LLM_TEMPERATURE_SUGGESTIONS,
        max_tokens=config.MAX_TOKENS_SUGGESTIONS,
        model=model,
    )

    result = await agent.run(
        "Gere 5 perguntas de exemplo úteis para iniciar uma conversa.",
        validator=lambda raw: _parse_suggestions(
            raw, table_names, previous_suggestions
        ),
    )

    suggestions = _parse_suggestions(
        result.output, table_names, previous_suggestions
    )
    return suggestions, result.tokens_used
