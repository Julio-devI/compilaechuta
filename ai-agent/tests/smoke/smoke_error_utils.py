"""Utilitários de impressão de erros para smoke tests."""

from typing import Any


def print_response_error(response: Any, *, indent: str = "   ") -> None:
    """Imprime erro estruturado retornado pelo agente."""
    debug_error = response.developer_debug.error
    if debug_error is None:
        print(f"{indent}Erro: n/a")
        return

    print(f"{indent}Erro: {debug_error.code}")
    print(f"{indent}Stage: {debug_error.stage}")
    print(f"{indent}Retryable: {debug_error.retryable}")
    print(f"{indent}Mensagem: {debug_error.message}")


def response_error_fields(response: Any) -> dict[str, Any]:
    """Extrai campos de erro estruturado para resumos."""
    debug_error = response.developer_debug.error
    if debug_error is None:
        return {
            "error_code": None,
            "error_stage": None,
            "error_message": None,
            "error_retryable": None,
        }

    return {
        "error_code": debug_error.code,
        "error_stage": debug_error.stage,
        "error_message": debug_error.message,
        "error_retryable": debug_error.retryable,
    }


def print_exception(exc: BaseException) -> None:
    """Imprime exceção usando código de domínio quando disponível."""
    error_code = getattr(exc, "error_code", None)
    if error_code is not None:
        code_value = getattr(error_code, "value", str(error_code))
        print(f"[ERRO] {code_value}: {exc}")
        return

    message = str(exc).strip()
    if message:
        print(f"[ERRO] {type(exc).__name__}: {message}")
        return

    print(f"[ERRO] {type(exc).__name__}: {exc!r}")
