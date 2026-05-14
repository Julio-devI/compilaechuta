"""
Exceções customizadas do módulo ai-agent.

Mapeiam erros técnicos da API Gemini para exceções de domínio
com mensagens amigáveis em português, permitindo que o backend
distingua falhas específicas sem depender de detalhes de
implementação do provedor de LLM.
"""

from enum import Enum

from google.api_core import exceptions as google_exceptions


class LLMError(RuntimeError):
    """Erro base para falhas de comunicação com o modelo LLM."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        super().__init__(message)
        self.original_error = original_error


class LLMAuthenticationError(LLMError):
    """Chave de API inválida, expirada ou sem permissão."""

    pass


class LLMRateLimitError(LLMError):
    """Rate limit por minuto da API excedido — recuperável aguardando."""

    pass


class LLMQuotaError(LLMError):
    """Quota diária ou de plano da API excedida."""

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


class LLMParseError(LLMError):
    """O LLM retornou uma resposta que não pôde ser parseada corretamente."""

    pass


class LLMUnknownError(LLMError):
    """Erro não categorizado na comunicação com o LLM."""

    pass


class ErrorCode(str, Enum):
    """
    Códigos padronizados para violações de segurança e erros operacionais.
    
    Estes códigos são trafegados internamente pelo agente e expostos
    no contrato do AgentResponse para que o backend (FastAPI) possa
    rastrear o motivo da falha e aplicar lógicas de negócio (ex:
    banimento temporário de usuário por PROMPT_INJECTION) sem
    que a mensagem opaca exibida ao usuário final seja alterada.
    """
    EMPTY_INPUT = "EMPTY_INPUT"
    INPUT_TOO_LONG = "INPUT_TOO_LONG"
    INVALID_INPUT_TYPE = "INVALID_INPUT_TYPE"
    PROMPT_INJECTION = "PROMPT_INJECTION"
    DESTRUCTIVE_QUERY = "DESTRUCTIVE_QUERY"
    MULTIPLE_STATEMENTS = "MULTIPLE_STATEMENTS"
    SCHEMA_VIOLATION_ALLOWLIST = "SCHEMA_VIOLATION_ALLOWLIST"
    SCHEMA_VIOLATION_SEMANTIC = "SCHEMA_VIOLATION_SEMANTIC"
    SQL_PARSE_ERROR = "SQL_PARSE_ERROR"
    EXECUTION_TIMEOUT = "EXECUTION_TIMEOUT"
    DB_EXECUTION_ERROR = "DB_EXECUTION_ERROR"
    SCHEMA_LOAD_ERROR = "SCHEMA_LOAD_ERROR"
    INSIGHT_PARSE_ERROR = "INSIGHT_PARSE_ERROR"
    LLM_AUTHENTICATION_ERROR = "LLM_AUTHENTICATION_ERROR"
    LLM_RATE_LIMIT_ERROR = "LLM_RATE_LIMIT_ERROR"
    LLM_QUOTA_ERROR = "LLM_QUOTA_ERROR"
    LLM_TIMEOUT_ERROR = "LLM_TIMEOUT_ERROR"
    LLM_UNAVAILABLE_ERROR = "LLM_UNAVAILABLE_ERROR"
    LLM_INVALID_REQUEST_ERROR = "LLM_INVALID_REQUEST_ERROR"
    LLM_INTERNAL_ERROR = "LLM_INTERNAL_ERROR"
    LLM_UNKNOWN_ERROR = "LLM_UNKNOWN_ERROR"
    UNKNOWN_GUARDRAIL = "UNKNOWN_GUARDRAIL"


class GuardrailError(RuntimeError):
    """
    Exceção levantada quando um guardrail de segurança ou qualidade é acionado.

    A mensagem interna é descritiva e destinada apenas ao pipeline interno
    (logs, prompt de autocorreção). Nunca deve ser exposta ao usuário final.
    """

    def __init__(self, message: str, error_code: str | ErrorCode = ErrorCode.UNKNOWN_GUARDRAIL) -> None:
        super().__init__(message)
        self.error_code = error_code


def is_rate_limit_per_minute_from_body(body: str) -> bool:
    """
    Parseia o body JSON do erro 429 para detectar rate limit por minuto.

    Args:
        body: Corpo bruto da resposta de erro (pode estar vazio).

    Returns:
        True se o erro for de rate limit por minuto (recuperável).
        Quando o body está vazio, assume True como fallback seguro.
    """
    import json

    if not body:
        return True  # fallback seguro: prefere retry a desistir prematuramente

    try:
        payload = json.loads(body)
        details = payload.get("error", {}).get("details", [])
        for detail in details:
            if detail.get("@type", "").endswith("QuotaFailure"):
                for violation in detail.get("violations", []):
                    quota_id = violation.get("quotaId", "")
                    if "PerMinute" in quota_id:
                        return True
                    if "PerDay" in quota_id:
                        return False
    except (json.JSONDecodeError, AttributeError):
        pass

    return True


def _is_rate_limit_per_minute(exc: Exception) -> bool:
    """
    Inspeciona o corpo da resposta de erro 429 para diferenciar
    rate limit por minuto (recuperável) de quota diária (não recuperável).

    Retorna True se o erro for de rate limit por minuto.
    """
    raw_body = ""
    # Tenta extrair o body de diferentes tipos de exceção
    if hasattr(exc, "body"):
        raw_body = str(exc.body) if exc.body else ""
    elif hasattr(exc, "_body"):
        raw_body = str(exc._body) if exc._body else ""
    elif hasattr(exc, "response") and hasattr(exc.response, "text"):
        raw_body = exc.response.text or ""

    return is_rate_limit_per_minute_from_body(raw_body)


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
        if _is_rate_limit_per_minute(exc):
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
