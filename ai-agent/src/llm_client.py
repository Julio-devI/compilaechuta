"""
Cliente reutilizável para chamadas ao LLM via PydanticAI + Gemini.

Encapsula a criação do modelo e do agente, permitindo que diferentes
módulos (sql_generator, insight_generator) reutilizem a infraestrutura
com configurações distintas.
"""

import asyncio
from collections.abc import Callable
from typing import Any

from google.api_core import exceptions as google_exceptions
from pydantic_ai import Agent
from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.models.gemini import GeminiModel
from pydantic_ai.settings import ModelSettings

from src import config
from src.exceptions import (
    LLMAuthenticationError,
    LLMError,
    LLMInternalError,
    LLMInvalidRequestError,
    LLMParseError,
    LLMQuotaError,
    LLMRateLimitError,
    LLMTimeoutError,
    LLMUnavailableError,
    LLMUnknownError,
    is_rate_limit_per_minute_from_body,
    map_google_error,
)


def _map_http_error(exc: ModelHTTPError) -> LLMError:
    """
    Converte uma exceção HTTP do PydanticAI em exceção de domínio do ai-agent.

    Mapeia status codes 4xx/5xx retornados pela API Gemini para subclasses
    de LLMError com mensagens amigáveis em português brasileiro.
    """
    status = exc.status_code

    if status in (401, 403):
        return LLMAuthenticationError(
            "Permissão negada pela API Gemini. "
            "Verifique se a chave GEMINI_API_KEY está configurada corretamente e se tem acesso ao modelo solicitado.",
            original_error=exc,
        )

    if status == 429:
        if is_rate_limit_per_minute_from_body(exc.body or ""):
            return LLMRateLimitError(
                "Limite de requisições por minuto atingido. "
                "Aguarde alguns instantes antes de tentar novamente.",
                original_error=exc,
            )
        return LLMQuotaError(
            "Limite diário de requisições da API Gemini atingido. "
            "Tente novamente amanhã ou verifique seu plano de uso.",
            original_error=exc,
        )

    if status in (408, 504):
        return LLMTimeoutError(
            "A API Gemini demorou demais para responder. "
            "Tente novamente ou simplifique a pergunta.",
            original_error=exc,
        )

    if status == 404:
        return LLMInvalidRequestError(
            "O modelo ou recurso solicitado não foi encontrado na API Gemini. "
            "Verifique se o modelo configurado está disponível.",
            original_error=exc,
        )

    if status in (500, 502):
        return LLMInternalError(
            "Erro interno nos servidores da Google Gemini. "
            "Este é um problema temporário do provedor. Tente novamente mais tarde.",
            original_error=exc,
        )

    if status == 503:
        return LLMUnavailableError(
            "O serviço Gemini está temporariamente indisponível. "
            "Aguarde um momento e tente novamente.",
            original_error=exc,
        )

    if status == 400:
        return LLMInvalidRequestError(
            "A requisição enviada à API Gemini é inválida. "
            "Verifique se o prompt está dentro dos limites permitidos.",
            original_error=exc,
        )

    return LLMUnknownError(
        f"Erro inesperado na comunicação com o modelo Gemini: {exc}",
        original_error=exc,
    )


_MAX_RETRIES = 3
"""Número máximo de tentativas para chamadas ao LLM em caso de instabilidade."""

_BACKOFF_BASE_SECONDS = 1.0
"""Tempo base (em segundos) para backoff exponencial: 1s, 2s, 4s."""

_RETRYABLE_ERRORS = (LLMUnavailableError, LLMInternalError, LLMTimeoutError, LLMParseError)
"""Exceções de domínio que merecem retry automático (instabilidade temporária ou resposta malformada)."""


class LLMAgent:
    """Wrapper reutilizável para execução de prompts via Gemini."""

    def __init__(
        self,
        system_prompt: str,
        temperature: float,
        max_tokens: int | None = None,
        model: str | None = None,
    ) -> None:
        """
        Inicializa o agente com o system prompt e parâmetros do modelo.

        Args:
            system_prompt: Instruções de sistema a serem injetadas no prompt.
            temperature: Temperatura do modelo (0.0 para determinístico).
            max_tokens: Limite máximo de tokens na resposta (None = padrão do modelo).
            model: Identificador do modelo Gemini a ser usado. Se None,
                utiliza o valor padrão de config.LLM_MODEL.

        Nota:
            A validação da chave de API ocorre no momento da instanciação.
            Como config.GEMINI_API_KEY é carregada no import de config.py,
            alterações em runtime após o import não serão refletidas aqui.
        """
        config.assert_gemini_key()

        model_name = model if model is not None else config.LLM_MODEL
        gemini_model = GeminiModel(model_name)

        settings_kwargs: dict[str, Any] = {"temperature": temperature}
        if max_tokens is not None:
            settings_kwargs["max_tokens"] = max_tokens
        settings = ModelSettings(**settings_kwargs)

        self._agent = Agent(
            gemini_model,
            system_prompt=system_prompt,
            model_settings=settings,
        )

    async def run(
        self,
        question: str,
        validator: Callable[[str], None] | None = None,
    ) -> str:
        """
        Executa o prompt contra o LLM e retorna o texto da resposta.

        Em caso de erros transientes de instabilidade (503, 500, 502, timeout)
        ou de resposta malformada que falhe na validação do `validator`,
        aplica retry automático com backoff exponencial (1s, 2s, 4s).

        Args:
            question: Pergunta ou instrução do usuário.
            validator: Função opcional que recebe o texto bruto da resposta e
                levanta `LLMParseError` caso o conteúdo esteja malformado.
                Quando fornecida, é executada dentro do loop de retry,
                permitindo que o LLM seja reinvocado automaticamente.

        Returns:
            Texto bruto retornado pelo modelo (já validado, se `validator` foi
            fornecido).

        Raises:
            LLMError: Se a comunicação com a API falhar, incluindo subtipos
                específicos (LLMAuthenticationError, LLMQuotaError, etc.).
        """
        last_error: LLMError | None = None

        for attempt in range(_MAX_RETRIES):
            try:
                result = await self._agent.run(question)
                output = result.output
                if validator is not None:
                    validator(output)
                return output
            except google_exceptions.GoogleAPIError as exc:
                mapped = map_google_error(exc)
                if not isinstance(mapped, _RETRYABLE_ERRORS) or attempt == _MAX_RETRIES - 1:
                    raise mapped from exc
                last_error = mapped
            except ModelHTTPError as exc:
                mapped = _map_http_error(exc)
                if not isinstance(mapped, _RETRYABLE_ERRORS) or attempt == _MAX_RETRIES - 1:
                    raise mapped from exc
                last_error = mapped
            except TimeoutError as exc:
                mapped = LLMTimeoutError(
                    "A API Gemini demorou demais para responder. "
                    "Tente novamente ou simplifique a pergunta.",
                    original_error=exc,
                )
                if attempt == _MAX_RETRIES - 1:
                    raise mapped from exc
                last_error = mapped
            except LLMError as exc:
                if not isinstance(exc, _RETRYABLE_ERRORS) or attempt == _MAX_RETRIES - 1:
                    raise
                last_error = exc

            # Backoff exponencial: 1s, 2s, 4s
            await asyncio.sleep(_BACKOFF_BASE_SECONDS * (2 ** attempt))

        # Fallback — nunca deveria chegar aqui, mas garante tipagem segura
        if last_error is not None:
            raise last_error
        raise LLMUnknownError("Falha inesperada após múltiplas tentativas.")
