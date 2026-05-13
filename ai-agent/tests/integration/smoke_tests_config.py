"""
Configuracoes centralizadas para os smoke tests do ai-agent.

Os smoke tests usam a API Gemini real. Por isso, este modulo concentra
as protecoes de quota do free tier: 20 requisicoes por dia e 5 requisicoes
por minuto por chave de API.
"""

import asyncio


MAX_API_CALLS_PER_DAY = 20
"""Limite diario da chave Gemini no free tier."""

MAX_API_CALLS_PER_MINUTE = 5
"""Limite por minuto da chave Gemini no free tier."""

DELAY_BETWEEN_LLM_INTERACTIONS_SECONDS = 75
"""Pausa segura entre interacoes que consomem LLM."""

MAX_DURATION_SECONDS = 1200
"""Timeout global por script de smoke test."""

LLM_RETRIES_IN_SMOKE_TESTS = 1
"""Retries do cliente LLM durante smoke tests.

O cliente de producao usa retries, mas em smoke tests isso pode consumir
requisicoes invisiveis e violar o teto de 5 req/min. O padrao 1 significa
uma tentativa por chamada LLM.
"""


def configure_llm_retries_for_smoke_tests() -> None:
    """Ajusta o cliente LLM para nao estourar quota durante smoke tests."""
    from vcommerce_ai_agent.llm import llm_client

    llm_client._MAX_RETRIES = LLM_RETRIES_IN_SMOKE_TESTS


def ensure_daily_budget(current_calls: int, planned_calls: int) -> bool:
    """Retorna True se ainda ha quota planejada para executar o cenario."""
    return current_calls + planned_calls <= MAX_API_CALLS_PER_DAY


async def wait_after_llm_interaction(planned_calls: int, is_last: bool) -> None:
    """Aguarda entre interacoes que consomem LLM para respeitar 5 req/min."""
    if is_last or planned_calls <= 0:
        return

    print(
        f"\n[AGUARDANDO] {DELAY_BETWEEN_LLM_INTERACTIONS_SECONDS}s "
        f"para respeitar {MAX_API_CALLS_PER_MINUTE} req/min..."
    )
    await asyncio.sleep(DELAY_BETWEEN_LLM_INTERACTIONS_SECONDS)
