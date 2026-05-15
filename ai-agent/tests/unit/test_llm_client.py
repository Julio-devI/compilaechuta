"""
Testes unitários do cliente LLM.
"""

import json

import httpx
import pytest
from google.api_core import exceptions as google_exceptions
from pydantic_ai.exceptions import ModelHTTPError

from vcommerce_ai_agent.core.exceptions import (
    LLMAuthenticationError,
    LLMInternalError,
    LLMInvalidRequestError,
    LLMParseError,
    LLMQuotaError,
    LLMRateLimitError,
    LLMTimeoutError,
    LLMUnavailableError,
    LLMUnknownError,
)
from vcommerce_ai_agent.llm import llm_client
from vcommerce_ai_agent.llm.llm_client import LLMAgent, _extract_tokens


class FakeUsage:
    """Objeto mínimo com total de tokens."""

    def __init__(self, total_tokens: int) -> None:
        self.total_tokens = total_tokens


class FakeResult:
    """Resultado mínimo retornado pelo agente falso."""

    def __init__(self, output: str, usage: FakeUsage | None = None) -> None:
        self.output = output
        self._usage = usage

    def usage(self) -> FakeUsage | None:
        return self._usage


class BrokenUsageResult:
    """Resultado cuja extração de usage falha."""

    def usage(self) -> None:
        raise RuntimeError("usage indisponível")


class SequenceAgent:
    """Agente falso que retorna ou levanta itens em sequência."""

    def __init__(self, events: list[object]) -> None:
        self._events = events
        self.calls = 0

    async def run(self, question: str) -> object:
        self.calls += 1
        event = self._events.pop(0)
        if isinstance(event, Exception):
            raise event
        return event


def _build_agent(fake_agent: SequenceAgent) -> LLMAgent:
    """Cria LLMAgent sem chamar o construtor real."""
    agent = object.__new__(LLMAgent)
    agent._agent = fake_agent
    return agent


def _quota_body(quota_id: str) -> str:
    """Monta body HTTP 429 com detalhe de quota."""
    return json.dumps(
        {
            "error": {
                "details": [
                    {
                        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                        "violations": [{"quotaId": quota_id}],
                    }
                ]
            }
        }
    )


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


@pytest.mark.parametrize(
    ("status_code", "body", "expected_error"),
    [
        (400, None, LLMInvalidRequestError),
        (401, None, LLMAuthenticationError),
        (403, None, LLMAuthenticationError),
        (404, None, LLMInvalidRequestError),
        (408, None, LLMTimeoutError),
        (429, _quota_body("GenerateContentPerMinute"), LLMRateLimitError),
        (429, _quota_body("GenerateContentPerDay"), LLMQuotaError),
        (500, None, LLMInternalError),
        (502, None, LLMInternalError),
        (503, None, LLMUnavailableError),
        (504, None, LLMTimeoutError),
        (418, None, LLMUnknownError),
    ],
)
@pytest.mark.asyncio
async def test_model_http_error_maps_status_codes(
    monkeypatch, status_code, body, expected_error
):
    fake_agent = SequenceAgent(
        [ModelHTTPError(status_code, "gemini-2.5-flash", body=body)]
    )
    agent = _build_agent(fake_agent)
    monkeypatch.setattr(llm_client, "_MAX_RETRIES", 1)

    with pytest.raises(expected_error):
        await agent.run("Pergunta")

    assert fake_agent.calls == 1


@pytest.mark.asyncio
async def test_non_retryable_http_error_does_not_retry(monkeypatch):
    fake_agent = SequenceAgent(
        [ModelHTTPError(400, "gemini-2.5-flash", body=None)]
    )
    agent = _build_agent(fake_agent)
    sleeps: list[float] = []

    async def fake_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    monkeypatch.setattr(llm_client, "_MAX_RETRIES", 3)
    monkeypatch.setattr(llm_client.asyncio, "sleep", fake_sleep)

    with pytest.raises(LLMInvalidRequestError):
        await agent.run("Pergunta")

    assert fake_agent.calls == 1
    assert sleeps == []


@pytest.mark.asyncio
async def test_retryable_http_error_retries_with_backoff(monkeypatch):
    fake_agent = SequenceAgent(
        [
            ModelHTTPError(503, "gemini-2.5-flash", body=None),
            ModelHTTPError(503, "gemini-2.5-flash", body=None),
            FakeResult("ok", FakeUsage(17)),
        ]
    )
    agent = _build_agent(fake_agent)
    sleeps: list[float] = []

    async def fake_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    monkeypatch.setattr(llm_client, "_MAX_RETRIES", 3)
    monkeypatch.setattr(llm_client, "_BACKOFF_BASE_SECONDS", 1.0)
    monkeypatch.setattr(llm_client.asyncio, "sleep", fake_sleep)

    result = await agent.run("Pergunta")

    assert result.output == "ok"
    assert result.tokens_used == 17
    assert fake_agent.calls == 3
    assert sleeps == [1.0, 2.0]


@pytest.mark.asyncio
async def test_validator_parse_error_retries(monkeypatch):
    fake_agent = SequenceAgent([FakeResult("malformado"), FakeResult("valido")])
    agent = _build_agent(fake_agent)
    sleeps: list[float] = []

    def validator(output: str) -> None:
        if output == "malformado":
            raise LLMParseError("Resposta malformada.")

    async def fake_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    monkeypatch.setattr(llm_client, "_MAX_RETRIES", 2)
    monkeypatch.setattr(llm_client.asyncio, "sleep", fake_sleep)

    result = await agent.run("Pergunta", validator=validator)

    assert result.output == "valido"
    assert fake_agent.calls == 2
    assert sleeps == [1.0]


@pytest.mark.parametrize(
    ("google_error", "expected_error"),
    [
        (google_exceptions.Unauthenticated("erro"), LLMAuthenticationError),
        (google_exceptions.PermissionDenied("erro"), LLMAuthenticationError),
        (google_exceptions.DeadlineExceeded("erro"), LLMTimeoutError),
        (google_exceptions.ServiceUnavailable("erro"), LLMUnavailableError),
        (google_exceptions.BadRequest("erro"), LLMInvalidRequestError),
        (google_exceptions.InternalServerError("erro"), LLMInternalError),
        (google_exceptions.GoogleAPIError("erro"), LLMUnknownError),
    ],
)
@pytest.mark.asyncio
async def test_google_api_errors_are_mapped(monkeypatch, google_error, expected_error):
    fake_agent = SequenceAgent([google_error])
    agent = _build_agent(fake_agent)
    monkeypatch.setattr(llm_client, "_MAX_RETRIES", 1)

    with pytest.raises(expected_error):
        await agent.run("Pergunta")

    assert fake_agent.calls == 1


@pytest.mark.asyncio
async def test_google_resource_exhausted_per_minute_maps_rate_limit(monkeypatch):
    google_error = google_exceptions.ResourceExhausted("quota")
    google_error._body = _quota_body("GenerateContentPerMinute")
    fake_agent = SequenceAgent([google_error])
    agent = _build_agent(fake_agent)
    sleeps: list[float] = []

    async def fake_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    monkeypatch.setattr(llm_client, "_MAX_RETRIES", 3)
    monkeypatch.setattr(llm_client.asyncio, "sleep", fake_sleep)

    with pytest.raises(LLMRateLimitError):
        await agent.run("Pergunta")

    assert fake_agent.calls == 1
    assert sleeps == []


@pytest.mark.asyncio
async def test_google_resource_exhausted_per_day_does_not_retry(monkeypatch):
    google_error = google_exceptions.ResourceExhausted("quota")
    google_error._body = _quota_body("GenerateContentPerDay")
    fake_agent = SequenceAgent([google_error])
    agent = _build_agent(fake_agent)
    sleeps: list[float] = []

    async def fake_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    monkeypatch.setattr(llm_client, "_MAX_RETRIES", 3)
    monkeypatch.setattr(llm_client.asyncio, "sleep", fake_sleep)

    with pytest.raises(LLMQuotaError):
        await agent.run("Pergunta")

    assert fake_agent.calls == 1
    assert sleeps == []


def test_extract_tokens_returns_total_tokens():
    result = FakeResult("ok", FakeUsage(42))
    assert _extract_tokens(result) == 42


def test_extract_tokens_returns_none_when_usage_absent():
    result = FakeResult("ok", None)
    assert _extract_tokens(result) is None


def test_extract_tokens_returns_none_when_usage_breaks():
    assert _extract_tokens(BrokenUsageResult()) is None
