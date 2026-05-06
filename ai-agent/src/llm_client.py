"""
Cliente reutilizável para chamadas ao LLM via PydanticAI + Gemini.

Encapsula a criação do modelo e do agente, permitindo que diferentes
módulos (sql_generator, insight_generator) reutilizem a infraestrutura
com configurações distintas.
"""

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
    LLMQuotaError,
    LLMTimeoutError,
    LLMUnavailableError,
    LLMUnknownError,
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
        return LLMQuotaError(
            "Limite de requisições da API Gemini atingido. "
            "Aguarde alguns instantes antes de tentar novamente.",
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


class LLMAgent:
    """Wrapper reutilizável para execução de prompts via Gemini."""

    def __init__(
        self,
        system_prompt: str,
        temperature: float,
        max_tokens: int | None = None,
    ) -> None:
        """
        Inicializa o agente com o system prompt e parâmetros do modelo.

        Args:
            system_prompt: Instruções de sistema a serem injetadas no prompt.
            temperature: Temperatura do modelo (0.0 para determinístico).
            max_tokens: Limite máximo de tokens na resposta (None = padrão do modelo).

        Nota:
            A validação da chave de API ocorre no momento da instanciação.
            Como config.GEMINI_API_KEY é carregada no import de config.py,
            alterações em runtime após o import não serão refletidas aqui.
        """
        config.assert_gemini_key()

        model = GeminiModel(config.LLM_MODEL)

        settings_kwargs: dict[str, Any] = {"temperature": temperature}
        if max_tokens is not None:
            settings_kwargs["max_tokens"] = max_tokens
        settings = ModelSettings(**settings_kwargs)

        self._agent = Agent(
            model,
            system_prompt=system_prompt,
            model_settings=settings,
        )

    async def run(self, question: str) -> str:
        """
        Executa o prompt contra o LLM e retorna o texto da resposta.

        Args:
            question: Pergunta ou instrução do usuário.

        Returns:
            Texto bruto retornado pelo modelo.

        Raises:
            LLMError: Se a comunicação com a API falhar, incluindo subtipos
                específicos (LLMAuthenticationError, LLMQuotaError, etc.).
        """
        try:
            result = await self._agent.run(question)
            return result.output
        except google_exceptions.GoogleAPIError as exc:
            raise map_google_error(exc) from exc
        except ModelHTTPError as exc:
            raise _map_http_error(exc) from exc
        except TimeoutError as exc:
            raise LLMTimeoutError(
                "A API Gemini demorou demais para responder. "
                "Tente novamente ou simplifique a pergunta.",
                original_error=exc,
            ) from exc
        except Exception as exc:
            raise LLMUnknownError(
                f"Falha inesperada na comunicação com o modelo Gemini: {exc}",
                original_error=exc,
            ) from exc
