"""
Guardrails de segurança e qualidade para o agente Text-to-SQL.

Este módulo contém validações independentes e testáveis que protegem
o sistema contra queries destrutivas, SQL injection e alucinações de
schema, organizadas em três camadas:

- Camada 1: validação do input do usuário (pré-LLM).
- Camada 2: validação do SQL gerado (pós-LLM).
- Camada 3: validação do resultado da execução.

Cada função de guardrail lança GuardrailError com mensagem interna
descritiva — nunca exposta ao usuário final.
"""

import re

from src.exceptions import GuardrailError


# ---------------------------------------------------------------------------
# Camada 2 — validação do SQL gerado (etapa 1)
# ---------------------------------------------------------------------------


def strip_sql_comments(sql: str) -> str:
    """
    Remove comentários SQL do texto (linha `--` e bloco `/* */`).

    Args:
        sql: Query SQL possivelmente contendo comentários.

    Returns:
        SQL limpo, sem comentários, preservando o restante do texto.
    """
    # Remove comentários de bloco /* ... */ (multilinha)
    cleaned = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    # Remove comentários de linha -- ... até o fim da linha
    cleaned = re.sub(r"--.*?$", "", cleaned, flags=re.MULTILINE)
    return cleaned


# Comandos bloqueados: qualquer coisa que não seja SELECT
_BLOCKED_COMMANDS_RE = re.compile(
    r"\b(DELETE|DROP|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|REPLACE|"
    r"ATTACH|DETACH|PRAGMA|VACUUM)\b",
    re.IGNORECASE,
)


def validate_destructive_queries(sql: str) -> None:
    """
    Bloqueia queries que contenham comandos destrutivos ou DDL/DML.

    Apenas SELECT é permitido. Qualquer ocorrência de DELETE, DROP,
    UPDATE, INSERT, ALTER, TRUNCATE, CREATE, REPLACE, ATTACH, DETACH,
    PRAGMA ou VACUUM dispara GuardrailError.

    Args:
        sql: Query SQL já sem comentários (recomenda-se chamar
             strip_sql_comments antes).

    Raises:
        GuardrailError: Se um comando bloqueado for detectado.
    """
    match = _BLOCKED_COMMANDS_RE.search(sql)
    if match:
        command = match.group(1).upper()
        raise GuardrailError(
            f"Comando bloqueado detectado no SQL: {command}. "
            f"Apenas consultas SELECT sao permitidas."
        )


_MULTIPLE_STATEMENTS_RE = re.compile(r";\s*\S+", re.MULTILINE)


def validate_multiple_statements(sql: str) -> None:
    """
    Detecta múltiplos statements separados por ponto-e-vírgula.

    SQLite já recusa múltiplos statements via cursor.execute(), mas este
    guardrail atua antes da execução para permitir retry controlado.

    Args:
        sql: Query SQL já sem comentários.

    Raises:
        GuardrailError: Se houver `;` seguido de conteúdo não-vazio.
    """
    if _MULTIPLE_STATEMENTS_RE.search(sql):
        raise GuardrailError(
            "Multiplos statements SQL detectados. "
            "Apenas um unico statement SELECT e permitido."
        )
