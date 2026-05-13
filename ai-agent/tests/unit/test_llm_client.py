"""
Testes unitários do cliente LLM.
"""

import httpx
import pytest

from vcommerce_ai_agent.core.exceptions import LLMTimeoutError
from vcommerce_ai_agent.llm import llm_client
from vcommerce_ai_agent.llm.llm_client import LLMAgent


@pytest.mark.asyncio
async def test_httpx_connect_timeout_maps_to_llm_timeout(monkeypatch):
    """Garante que timeouts HTTP não vazem como exceções brutas."""

    class FakeAgent:
        async def run(self, question: str):
            raise httpx.ConnectTimeout("")

    agent = object.__new__(LLMAgent)
    agent._agent = FakeAgent()

    monkeypatch.setattr(llm_client, "_MAX_RETRIES", 1)

    with pytest.raises(LLMTimeoutError) as exc_info:
        await agent.run("Pergunta")

    assert isinstance(exc_info.value.original_error, httpx.ConnectTimeout)
    assert "A API Gemini demorou demais para responder" in str(exc_info.value)
