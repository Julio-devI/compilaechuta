"""
Exceções customizadas do módulo ai-agent.

Mapeiam erros técnicos da API Gemini para exceções de domínio
com mensagens amigáveis em português, permitindo que o backend
distingua falhas específicas sem depender de detalhes de
implementação do provedor de LLM.
"""

from google.api_core import exceptions as google_exceptions


class LLMError(RuntimeError):
    """Erro base para falhas de comunicação com o modelo LLM."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        super().__init__(message)
        self.original_error = original_error


class LLMAuthenticationError(LLMError):
    """Chave de API inválida, expirada ou sem permissão."""

    pass


class LLMQuotaError(LLMError):
    """Quota ou rate limit da API excedido."""

    pass


class LLMTimeoutError(LLMError):
    """Tempo de resposta da API excedido."""

    pass


class LLMUnavailableError(LLMError):
    """Serviço do LLM temporariamente indisponível."""

    pass


class LLMInvalidRequestError(LLMError):
    """Requisição malformada ou parâmetros inválidos."""

    pass


class LLMInternalError(LLMError):
    """Erro interno no servidor do provedor de LLM."""

    pass


class LLMUnknownError(LLMError):
    """Erro não categorizado na comunicação com o LLM."""

    pass


def map_google_error(exc: google_exceptions.GoogleAPIError) -> LLMError:
    """
    Converte uma exceção do Google API Core em exceção de domínio do ai-agent.

    Mapeia erros conhecidos da API Gemini para subclasses de LLMError,
    preservando a exceção original em `original_error` e adicionando
    mensagens amigáveis em português brasileiro.

    Args:
        exc: Exceção lançada pelo cliente Google API Core.

    Returns:
        Instância de subclasse de LLMError com contexto apropriado.
    """
    message = str(exc)

    if isinstance(exc, google_exceptions.Unauthenticated):
        return LLMAuthenticationError(
            "Falha de autenticação com a API Gemini. "
            "Verifique se a chave GEMINI_API_KEY está configurada corretamente no arquivo .env.",
            original_error=exc,
        )

    if isinstance(exc, google_exceptions.PermissionDenied):
        return LLMAuthenticationError(
            "Permissão negada pela API Gemini. "
            "A chave de API pode não ter acesso ao modelo solicitado.",
            original_error=exc,
        )

    if isinstance(exc, google_exceptions.ResourceExhausted):
        return LLMQuotaError(
            "Limite de requisições da API Gemini atingido. "
            "Aguarde alguns instantes antes de tentar novamente.",
            original_error=exc,
        )

    if isinstance(exc, google_exceptions.DeadlineExceeded):
        return LLMTimeoutError(
            "A API Gemini demorou demais para responder. "
            "Tente novamente ou simplifique a pergunta.",
            original_error=exc,
        )

    if isinstance(exc, google_exceptions.ServiceUnavailable):
        return LLMUnavailableError(
            "O serviço Gemini está temporariamente indisponível. "
            "Aguarde um momento e tente novamente.",
            original_error=exc,
        )

    if isinstance(exc, google_exceptions.BadRequest):
        return LLMInvalidRequestError(
            "A requisição enviada à API Gemini é inválida. "
            "Verifique se o prompt está dentro dos limites permitidos.",
            original_error=exc,
        )

    if isinstance(exc, google_exceptions.InternalServerError):
        return LLMInternalError(
            "Erro interno nos servidores da Google Gemini. "
            "Este é um problema temporário do provedor. Tente novamente mais tarde.",
            original_error=exc,
        )

    # Fallback para erros não mapeados
    return LLMUnknownError(
        f"Erro inesperado na comunicação com o modelo Gemini: {message}",
        original_error=exc,
    )
