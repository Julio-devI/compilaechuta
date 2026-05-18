"""
Módulo de geração de SQL (Chamada 1).

Responsável por montar o prompt com o schema do banco, invocar o LLM
(Gemini via PydanticAI) e extrair/validar a query SQL retornada.
"""

import json
import re
from pathlib import Path
from typing import Any

from vcommerce_ai_agent.core import config
from vcommerce_ai_agent.core.exceptions import LLMParseError
from vcommerce_ai_agent.llm.llm_client import LLMAgent

_PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "sql_system.txt"
_CORRECTION_PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "sql_correction_system.txt"
_HISTORY_DATA_SAMPLE_ROWS = 5
_HISTORY_DATA_SAMPLE_COLUMNS = 12
_HISTORY_JSON_MAX_CHARS = 1800
_OMITTED_TEXT_VALUE = "<valor_textual_omitido>"
_OUT_OF_SCOPE_RE = re.compile(
    rf"\b{re.escape(config.OUT_OF_SCOPE_MARKER)}\b\s*[:\-]?\s*(.*)",
    re.IGNORECASE | re.DOTALL,
)
_TEMPORAL_TEXT_RE = re.compile(
    r"^\d{4}(-\d{2}){0,2}$|^Q[1-4]$|^\d{4}-Q[1-4]$",
    re.IGNORECASE,
)


def _format_initial_context(initial_context: str | None) -> str:
    """Formata o contexto inicial da tela para o prompt da Chamada 1."""
    if not initial_context or not initial_context.strip():
        return ""

    return (
        "## Contexto Inicial da Tela\n"
        f"{initial_context.strip()}\n\n"
        "Use este contexto apenas como ponto de partida para desambiguar a "
        "primeira pergunta quando ela for genérica. Ele não restringe o "
        "escopo da conversa e não deve prevalecer sobre pedidos explícitos "
        "do usuário.\n"
    )


def _load_system_prompt(
    schema: str,
    history_text: str = "",
    initial_context: str | None = None,
) -> str:
    """Carrega o template do system prompt e injeta o schema dinâmico e o histórico."""
    if not _PROMPT_PATH.exists():
        raise FileNotFoundError(f"Prompt não encontrado: {_PROMPT_PATH}")
    template = _PROMPT_PATH.read_text(encoding="utf-8")
    replacements = {
        "{schema}": schema,
        "{history}": history_text,
        "{initial_context}": _format_initial_context(initial_context),
    }
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


def _extract_out_of_scope(raw: str) -> str | None:
    """Extrai marcador FORA_DO_ESCOPO mesmo quando envelopado em markdown."""
    text = raw.strip()
    fenced = re.search(r"```\w*\s*(.*?)\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1).strip()

    match = _OUT_OF_SCOPE_RE.search(text)
    if not match:
        return None

    reason = match.group(1).strip()
    return f"{config.OUT_OF_SCOPE_MARKER} {reason}".strip()


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
    if _extract_out_of_scope(raw) is not None:
        return

    sql = _extract_sql(raw)
    try:
        _validate_syntax(sql)
    except ValueError as exc:
        raise LLMParseError(
            "A resposta do LLM não continha um SQL válido. "
            "Tentando novamente..."
        ) from exc


def _safe_history_sample_value(value: Any) -> Any:
    """Preserva apenas valores seguros para orientar follow-ups."""
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    if isinstance(value, str) and _TEMPORAL_TEXT_RE.match(value.strip()):
        return value.strip()
    return _OMITTED_TEXT_VALUE


def _build_history_data_context(data: Any) -> dict[str, Any] | None:
    """Resume dados salvos no histórico sem expor valores textuais livres."""
    if not isinstance(data, list):
        return None

    columns: list[str] = []
    sampled_rows: list[dict[str, Any]] = []
    for row in data[:_HISTORY_DATA_SAMPLE_ROWS]:
        if not isinstance(row, dict):
            continue
        sampled_row: dict[str, Any] = {}
        for index, (key, value) in enumerate(row.items()):
            if index >= _HISTORY_DATA_SAMPLE_COLUMNS:
                break
            column = str(key)
            if column not in columns:
                columns.append(column)
            sampled_row[column] = _safe_history_sample_value(value)
        if sampled_row:
            sampled_rows.append(sampled_row)

    if not columns and not sampled_rows:
        return None

    return {
        "row_count": len(data),
        "columns": columns,
        "sample_rows": sampled_rows,
    }


def _format_history_json(value: Any) -> str:
    """Serializa contexto auxiliar do histórico com limite de tamanho."""
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if len(text) <= _HISTORY_JSON_MAX_CHARS:
        return text
    return text[: _HISTORY_JSON_MAX_CHARS - 3].rstrip() + "..."


def format_history_for_sql(history: list[dict[str, Any]] | None) -> str:
    """Formata o histórico de conversa para injeção no prompt da Chamada 1."""
    if not history:
        return ""

    lines = ["## Histórico da Conversa\n"]
    turn = 0
    for i in range(0, len(history), 2):
        if i + 1 >= len(history):
            break
        turn += 1
        user_msg = history[i]
        assistant_msg = history[i + 1]
        lines.append(f"Interação {turn}:")
        lines.append(f"Pergunta: {user_msg['content']}")
        lines.append(f"Resposta: {assistant_msg['content']}")
        if assistant_msg.get("sql"):
            lines.append(f"SQL gerado: {assistant_msg['sql']}")
        sources_text = assistant_msg.get("sources_text")
        if isinstance(sources_text, str) and sources_text.strip():
            lines.append(f"Fontes: {sources_text.strip()}")
        data_context = _build_history_data_context(assistant_msg.get("data"))
        if data_context:
            lines.append(
                "Perfil compacto dos dados retornados: "
                f"{_format_history_json(data_context)}"
            )
        chart = assistant_msg.get("chart")
        if isinstance(chart, dict):
            chart_context = {
                key: chart.get(key)
                for key in ("type", "x_axis", "y_axis", "y_axis_format")
                if chart.get(key) is not None
            }
            if chart_context:
                lines.append(
                    "Grafico sugerido: "
                    f"{_format_history_json(chart_context)}"
                )
        lines.append("")

    lines.append(
        "Considere o histórico acima ao gerar o SQL para a pergunta atual. "
        "Resolva pronomes e referências implícitas com base nas perguntas, "
        "respostas, SQLs e dados retornados das interações anteriores. "
        "Quando o usuário pedir comparação com períodos anteriores, preserve "
        "a métrica, a entidade, os filtros de negócio e a granularidade temporal "
        "da interação anterior.\n"
    )
    return "\n".join(lines)


async def generate_sql(
    question: str,
    schema: str,
    history: list[dict[str, Any]] | None = None,
    model: str | None = None,
    initial_context: str | None = None,
) -> tuple[str, int | None]:
    """
    Gera uma query SQL a partir de uma pergunta em linguagem natural.

    Args:
        question: Pergunta do usuário em português.
        schema: Schema completo do banco formatado como texto.
        model: Identificador do modelo Gemini. Se None, usa o padrão.

    Returns:
        Tupla contendo a query SQL (ou o marcador "FORA_DO_ESCOPO ...") e
        o número de tokens consumidos na chamada, quando disponível.

    Raises:
        FileNotFoundError: Se o arquivo de prompt não for encontrado.
        ValueError: Se o SQL gerado não passar na validação sintática.
        RuntimeError: Se a chamada ao LLM falhar.
    """
    history_text = format_history_for_sql(history)
    system_prompt = _load_system_prompt(
        schema,
        history_text=history_text,
        initial_context=initial_context,
    )

    agent = LLMAgent(
        system_prompt=system_prompt,
        temperature=0.0,
        max_tokens=config.MAX_TOKENS_SQL,
        model=model,
    )

    result = await agent.run(question, validator=_validate_sql_response)
    raw_output = result.output

    # Detecta marcador de fora do escopo antes de qualquer parsing
    out_of_scope = _extract_out_of_scope(raw_output)
    if out_of_scope is not None:
        return out_of_scope, result.tokens_used

    sql = _extract_sql(raw_output)
    _validate_syntax(sql)
    return sql, result.tokens_used


def _load_correction_prompt(
    schema: str, sql: str, error: str, history_text: str = ""
) -> str:
    """Carrega o template do prompt de correção e injeta variáveis."""
    if not _CORRECTION_PROMPT_PATH.exists():
        raise FileNotFoundError(
            f"Prompt de correcao nao encontrado: {_CORRECTION_PROMPT_PATH}"
        )
    template = _CORRECTION_PROMPT_PATH.read_text(encoding="utf-8")
    replacements = {
        "{schema}": schema,
        "{sql}": sql,
        "{error}": error,
        "{history}": history_text,
    }
    pattern = re.compile("|".join(re.escape(k) for k in replacements))
    return pattern.sub(lambda m: replacements[m.group(0)], template)


async def generate_sql_correction(
    question: str,
    sql: str,
    error: str,
    schema: str,
    history: list[dict[str, Any]] | None = None,
    model: str | None = None,
) -> tuple[str, int | None]:
    """
    Solicita ao LLM uma correção do SQL que falhou nos guardrails.

    Args:
        question: Pergunta original do usuário.
        sql: SQL problemático que falhou na validação.
        error: Mensagem técnica do erro (da exceção GuardrailError).
        schema: Schema completo do banco formatado como texto.
        model: Identificador do modelo Gemini. Se None, usa o padrão.

    Returns:
        Tupla contendo o SQL corrigido (ou marcador "FORA_DO_ESCOPO ...") e
        o número de tokens consumidos na chamada, quando disponível.

    Raises:
        FileNotFoundError: Se o arquivo de prompt não for encontrado.
        LLMError: Se a chamada ao LLM falhar.
    """
    history_text = format_history_for_sql(history)
    system_prompt = _load_correction_prompt(schema, sql, error, history_text=history_text)

    agent = LLMAgent(
        system_prompt=system_prompt,
        temperature=0.0,
        max_tokens=config.MAX_TOKENS_SQL,
        model=model,
    )

    result = await agent.run(question, validator=_validate_sql_response)
    raw_output = result.output

    out_of_scope = _extract_out_of_scope(raw_output)
    if out_of_scope is not None:
        return out_of_scope, result.tokens_used

    corrected = _extract_sql(raw_output)
    _validate_syntax(corrected)
    return corrected, result.tokens_used
