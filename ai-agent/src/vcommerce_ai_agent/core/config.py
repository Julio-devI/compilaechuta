"""
Configurações centralizadas do agente de IA.

Carrega variáveis de ambiente via python-dotenv e expõe constantes
utilizadas pelos demais módulos do pacote.
"""

import os
import warnings
from collections.abc import Iterable
from pathlib import Path

from dotenv import load_dotenv

_AI_AGENT_ROOT = Path(__file__).resolve().parents[3]
_REPO_ROOT = _AI_AGENT_ROOT.parent
_BACKEND_ENV_PATH = _REPO_ROOT / "backend" / ".env"
_AI_AGENT_ENV_PATH = _AI_AGENT_ROOT / ".env"


def _candidate_env_paths() -> tuple[Path, ...]:
    """
    Retorna arquivos `.env` aceitos em ordem de precedência.

    O ambiente do processo sempre tem precedência porque `load_dotenv`
    é chamado com `override=False`. Em seguida, o carregamento privilegia
    o `.env` do backend e usa o `.env` do módulo apenas como fallback para
    execuções isoladas.
    """
    paths = (
        _BACKEND_ENV_PATH,
        _AI_AGENT_ENV_PATH,
    )
    unique_paths: list[Path] = []
    seen: set[Path] = set()
    for path in paths:
        marker = path.resolve(strict=False)
        if marker in seen:
            continue
        seen.add(marker)
        unique_paths.append(path)
    return tuple(unique_paths)


def _load_env_files(paths: Iterable[Path]) -> tuple[Path, ...]:
    """Carrega arquivos `.env` existentes sem sobrescrever o ambiente."""
    loaded_paths: list[Path] = []
    for path in paths:
        if not path.is_file():
            continue
        load_dotenv(dotenv_path=path, override=False)
        loaded_paths.append(path)
    return tuple(loaded_paths)


_ENV_PATHS = _candidate_env_paths()
_LOADED_ENV_PATHS = _load_env_files(_ENV_PATHS)


def _format_env_paths(paths: Iterable[Path]) -> str:
    """Formata caminhos de `.env` para mensagens de erro e warning."""
    return ", ".join(str(path) for path in paths)


DB_PATH: str = os.getenv("DB_PATH", "")
"""Caminho absoluto ou relativo para o banco SQLite gerenciado pelo backend."""

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
"""Chave de API para acesso ao modelo Google Gemini."""

LLM_MODEL: str = "gemini-2.5-flash"
"""Identificador padrão do modelo LLM utilizado nas chamadas ao Gemini."""

LLM_TEMPERATURE_INSIGHT: float = float(os.getenv("LLM_TEMPERATURE_INSIGHT", "0.3"))
"""Temperatura moderada (0.3) para geração de insights na Chamada 2."""

LLM_TEMPERATURE_SUGGESTIONS: float = float(os.getenv("LLM_TEMPERATURE_SUGGESTIONS", "0.5"))
"""Temperatura moderada (0.5) para geração de sugestões iniciais."""

QUERY_TIMEOUT_SECONDS: int = 10
"""Timeout padrão em segundos para execução de queries no banco de dados."""

MAX_TOKENS_SQL: int = 4096
"""Limite de tokens para a Chamada 1 (geração de SQL). Inclui o orçamento de pensamento do Gemini 2.5 Flash, que pode consumir milhares de tokens antes da resposta final."""

MAX_TOKENS_INSIGHT: int = 16384
"""Limite de tokens para a Chamada 2 (geração de insight). Inclui o orçamento de pensamento do Gemini 2.5 Flash, que pode consumir milhares de tokens antes do JSON final."""

MAX_TOKENS_SUGGESTIONS: int = 4096
"""Limite de tokens para a geração de sugestões iniciais. Inclui o orçamento de pensamento do Gemini 2.5 Flash."""

MAX_ROWS: int = 1000
"""Número máximo de linhas retornadas por query para evitar sobrecarga."""

MAX_INPUT_CHARS: int = 500
"""Limite de caracteres para a pergunta do usuário (pré-LLM)."""

MAX_HISTORY_TURNS: int = 20
"""Número máximo de turnos (pares pergunta/resposta) mantidos no histórico da conversa."""

OUT_OF_SCOPE_MARKER: str = "FORA_DO_ESCOPO"
"""Marcador textual retornado pelo LLM quando a pergunta está fora do escopo do domínio."""


def _validate() -> None:
    """
    Validação eager das variáveis obrigatórias.

    Emite um aviso caso a chave da API esteja ausente, sem interromper
    a execução do programa. A validação estrita ocorre no momento do uso
    via `assert_gemini_key()`.
    """
    if not GEMINI_API_KEY:
        expected_paths = _format_env_paths(_ENV_PATHS)
        warnings.warn(
            f"GEMINI_API_KEY não está definida. Verifique os arquivos .env em {expected_paths}. "
            "A chamada ao LLM falhará caso a chave não seja configurada.",
            stacklevel=2,
        )


def assert_gemini_key() -> None:
    """Falha com exceção se a chave da API não estiver configurada."""
    if not GEMINI_API_KEY:
        expected_paths = _format_env_paths(_ENV_PATHS)
        raise EnvironmentError(
            f"Variável de ambiente obrigatória não definida: GEMINI_API_KEY. "
            f"Verifique os arquivos .env em {expected_paths}"
        )


_validate()
