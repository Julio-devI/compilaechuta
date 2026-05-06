"""
Configurações centralizadas do agente de IA.

Carrega variáveis de ambiente via python-dotenv e expõe constantes
utilizadas pelos demais módulos do pacote.
"""

import os
import warnings
from pathlib import Path

from dotenv import load_dotenv

# Carrega variáveis do .env localizado na raiz do módulo ai-agent
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)


DB_PATH: str = os.getenv("DB_PATH", "")
"""Caminho absoluto ou relativo para o banco SQLite gerenciado pelo backend."""

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
"""Chave de API para acesso ao modelo Google Gemini."""

LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-2.5-flash")
"""Identificador do modelo LLM utilizado nas chamadas ao Gemini."""

LLM_TEMPERATURE_INSIGHT: float = float(os.getenv("LLM_TEMPERATURE_INSIGHT", "0.3"))
"""Temperatura moderada (0.3) para geração de insights na Chamada 2."""

QUERY_TIMEOUT_SECONDS: int = int(os.getenv("QUERY_TIMEOUT_SECONDS", "10"))
"""Timeout em segundos para execução de queries no banco de dados."""

MAX_TOKENS_SQL: int = 1024
"""Limite de tokens para a Chamada 1 (geração de SQL)."""

MAX_TOKENS_INSIGHT: int = 4096
"""Limite de tokens para a Chamada 2 (geração de insight)."""

MAX_ROWS: int = int(os.getenv("MAX_ROWS", "1000"))
"""Número máximo de linhas retornadas por query para evitar sobrecarga."""


def _validate() -> None:
    """
    Validação eager das variáveis obrigatórias.

    Emite um aviso caso a chave da API esteja ausente, sem interromper
    a execução do programa. A validação estrita ocorre no momento do uso
    via `assert_gemini_key()`.
    """
    if not GEMINI_API_KEY:
        warnings.warn(
            f"GEMINI_API_KEY não está definida. Verifique o arquivo .env em {_ENV_PATH}. "
            "A chamada ao LLM falhará caso a chave não seja configurada.",
            stacklevel=2,
        )


def assert_gemini_key() -> None:
    """Falha com exceção se a chave da API não estiver configurada."""
    if not GEMINI_API_KEY:
        raise EnvironmentError(
            f"Variável de ambiente obrigatória não definida: GEMINI_API_KEY. "
            f"Verifique o arquivo .env em {_ENV_PATH}"
        )


_validate()
