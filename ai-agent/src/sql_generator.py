"""
Módulo de geração de SQL (Chamada 1).

Responsável por montar o prompt com o schema do banco, invocar o LLM
(Gemini via PydanticAI) e extrair/validar a query SQL retornada.
"""

import re
from pathlib import Path

from src import config
from src.exceptions import LLMParseError
from src.llm_client import LLMAgent

_PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "sql_system.txt"
_CORRECTION_PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "sql_correction_system.txt"


def _load_system_prompt(schema: str) -> str:
    """Carrega o template do system prompt e injeta o schema dinâmico."""
    if not _PROMPT_PATH.exists():
        raise FileNotFoundError(f"Prompt não encontrado: {_PROMPT_PATH}")
    template = _PROMPT_PATH.read_text(encoding="utf-8")
    replacements = {"{schema}": schema}
    pattern = re.compile("|".join(re.escape(k) for k in replacements))
    return pattern.sub(lambda m: replacements[m.group(0)], template)


def _extract_sql(raw: str) -> str:
    """
    Extrai o conteúdo SQL de um bloco ```sql ... ``` da resposta do LLM.

    Se não houver bloco delimitado, retorna o texto completo (com sanitização).
    Blocos incompletos (sem fechamento ```) são intencionalmente rejeitados aqui;
    a política de retry do llm_client reinvoca o LLM automaticamente quando
    a validação sintática falhar.
    """
    match = re.search(r"```sql\s*(.*?)\s*```", raw, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return raw.strip()


def _strip_sql_comments(sql: str) -> str:
    """Remove comentários SQL antes da validação sintática."""
    # Remove comentários de bloco /* ... */
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    # Remove comentários de linha -- ...
    sql = re.sub(r"--.*", "", sql)
    return sql.strip()


def _validate_syntax(sql: str) -> None:
    """
    Validação sintática mínima do SQL gerado.

    Regras:
        - Deve começar com SELECT ou WITH (ignorando espaços, parênteses e comentários).

    Raises:
        ValueError: Se o SQL não passar na validação.
    """
    cleaned = _strip_sql_comments(sql)

    # Remove parênteses iniciais recursivamente para subqueries ou expressões
    while cleaned.startswith("("):
        cleaned = cleaned[1:].strip()

    upper = cleaned.upper()
    if not (upper.startswith("SELECT") or upper.startswith("WITH")):
        raise ValueError(
            "A query gerada não parece ser um SELECT válido. "
            "Apenas consultas de leitura são permitidas."
        )


def _validate_sql_response(raw: str) -> None:
    """
    Valida se a resposta bruta do LLM contém um SQL extraível e sintaticamente válido.

    Levanta `LLMParseError` quando o bloco markdown está incompleto ou o SQL
    não passa na validação de segurança, permitindo que o `llm_client` reintente
    a chamada automaticamente.
    """
    # Marcador de fora do escopo é válido — não deve disparar retry
    stripped = raw.strip()
    if stripped.upper().startswith(config.OUT_OF_SCOPE_MARKER):
        return

    sql = _extract_sql(raw)
    try:
        _validate_syntax(sql)
    except ValueError as exc:
        raise LLMParseError(
            "A resposta do LLM não continha um SQL válido. "
            "Tentando novamente..."
        ) from exc


async def generate_sql(
    question: str, schema: str, model: str | None = None
) -> str:
    """
    Gera uma query SQL a partir de uma pergunta em linguagem natural.

    Args:
        question: Pergunta do usuário em português.
        schema: Schema completo do banco formatado como texto.
        model: Identificador do modelo Gemini. Se None, usa o padrão.

    Returns:
        String contendo a query SQL (ou o marcador "FORA_DO_ESCOPO ...").

    Raises:
        FileNotFoundError: Se o arquivo de prompt não for encontrado.
        ValueError: Se o SQL gerado não passar na validação sintática.
        RuntimeError: Se a chamada ao LLM falhar.
    """
    system_prompt = _load_system_prompt(schema)

    agent = LLMAgent(
        system_prompt=system_prompt,
        temperature=0.0,
        max_tokens=config.MAX_TOKENS_SQL,
        model=model,
    )

    raw_output = await agent.run(question, validator=_validate_sql_response)

    # Detecta marcador de fora do escopo antes de qualquer parsing
    stripped = raw_output.strip()
    if stripped.upper().startswith(config.OUT_OF_SCOPE_MARKER):
        return stripped

    sql = _extract_sql(raw_output)
    _validate_syntax(sql)
    return sql


def _load_correction_prompt(schema: str, sql: str, error: str) -> str:
    """Carrega o template do prompt de correção e injeta variáveis."""
    if not _CORRECTION_PROMPT_PATH.exists():
        raise FileNotFoundError(
            f"Prompt de correcao nao encontrado: {_CORRECTION_PROMPT_PATH}"
        )
    template = _CORRECTION_PROMPT_PATH.read_text(encoding="utf-8")
    replacements = {"{schema}": schema, "{sql}": sql, "{error}": error}
    pattern = re.compile("|".join(re.escape(k) for k in replacements))
    return pattern.sub(lambda m: replacements[m.group(0)], template)


async def generate_sql_correction(
    question: str,
    sql: str,
    error: str,
    schema: str,
    model: str | None = None,
) -> str:
    """
    Solicita ao LLM uma correção do SQL que falhou nos guardrails.

    Args:
        question: Pergunta original do usuário.
        sql: SQL problemático que falhou na validação.
        error: Mensagem técnica do erro (da exceção GuardrailError).
        schema: Schema completo do banco formatado como texto.
        model: Identificador do modelo Gemini. Se None, usa o padrão.

    Returns:
        SQL corrigido (ou marcador "FORA_DO_ESCOPO ...").

    Raises:
        FileNotFoundError: Se o arquivo de prompt não for encontrado.
        LLMError: Se a chamada ao LLM falhar.
    """
    system_prompt = _load_correction_prompt(schema, sql, error)

    agent = LLMAgent(
        system_prompt=system_prompt,
        temperature=0.0,
        max_tokens=config.MAX_TOKENS_SQL,
        model=model,
    )

    raw_output = await agent.run(question, validator=_validate_sql_response)

    stripped = raw_output.strip()
    if stripped.upper().startswith(config.OUT_OF_SCOPE_MARKER):
        return stripped

    corrected = _extract_sql(raw_output)
    _validate_syntax(corrected)
    return corrected
