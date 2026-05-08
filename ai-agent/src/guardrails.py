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

import sqlglot
import sqlglot.expressions as exp

from src.config import MAX_INPUT_CHARS
from src.exceptions import GuardrailError


# ---------------------------------------------------------------------------
# Camada 1 — validação do input do usuário (pré-LLM)
# ---------------------------------------------------------------------------


def validate_empty_input(question: str) -> None:
    """
    Rejeita input vazio ou composto apenas de espaços em branco.

    Args:
        question: Pergunta do usuário em português.

    Raises:
        GuardrailError: Se a string, após strip(), estiver vazia.
    """
    if question.strip() == "":
        raise GuardrailError("Input do usuario esta vazio.")


def validate_input_length(question: str) -> None:
    """
    Rejeita input com comprimento superior a MAX_INPUT_CHARS.

    Args:
        question: Pergunta do usuário em português.

    Raises:
        GuardrailError: Se o comprimento exceder o limite configurado.
    """
    if len(question) > MAX_INPUT_CHARS:
        raise GuardrailError(
            f"Input do usuario excede o limite de {MAX_INPUT_CHARS} caracteres. "
            f"Comprimento recebido: {len(question)}."
        )


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


# ---------------------------------------------------------------------------
# Camada 2 — validação do SQL gerado (etapa 2)
# ---------------------------------------------------------------------------


def validate_table_column_allowlist(
    sql: str, allowlist: dict[str, set[str]]
) -> None:
    """
    Valida se todas as tabelas e colunas referenciadas no SQL
    existem no allowlist extraído do schema real do banco.

    CTEs (Common Table Expressions) são identificadas automaticamente
    e ignoradas na checagem de tabelas, pois são temporárias.

    Args:
        sql: Query SQL já sem comentários e validado sintaticamente.
        allowlist: Dicionário mapeando nome da tabela para conjunto
            de nomes de colunas permitidas.

    Raises:
        GuardrailError: Se uma tabela ou coluna fora do allowlist
            for detectada.
    """
    try:
        parsed = sqlglot.parse_one(sql, read="sqlite")
    except Exception as exc:
        raise GuardrailError(
            f"Falha ao parsear SQL para allowlist: {exc}"
        ) from exc

    cte_names = {cte.alias for cte in parsed.find_all(exp.CTE)}

    for table in parsed.find_all(exp.Table):
        if table.name in cte_names:
            continue
        if table.name not in allowlist:
            raise GuardrailError(
                f"Tabela '{table.name}' nao esta no allowlist do schema."
            )

    allowed_columns: set[str] = set()
    for cols in allowlist.values():
        allowed_columns.update(cols)

    for col in parsed.find_all(exp.Column):
        if col.name not in allowed_columns:
            raise GuardrailError(
                f"Coluna '{col.name}' nao esta no allowlist do schema."
            )


def validate_semantic_schema(
    sql: str, allowlist: dict[str, set[str]]
) -> None:
    """
    Valida se colunas referenciadas pertencem às tabelas declaradas
    no FROM e JOIN da query, resolvendo aliases corretamente.

    Args:
        sql: Query SQL já sem comentários.
        allowlist: Dicionário mapeando nome da tabela para conjunto
            de nomes de colunas permitidas.

    Raises:
        GuardrailError: Se uma coluna não puder ser associada a uma
            tabela do escopo ou se o SQL não puder ser parseado.
    """
    try:
        parsed = sqlglot.parse_one(sql, read="sqlite")
    except Exception as exc:
        raise GuardrailError(
            f"Falha ao parsear SQL para validacao semantica: {exc}"
        ) from exc

    # Mapeia alias -> nome real das tabelas no escopo (inclui CTEs)
    scope_tables: dict[str, str] = {}
    for table in parsed.find_all(exp.Table):
        alias = table.alias or table.name
        scope_tables[alias] = table.name

    allowed_columns_global: set[str] = set()
    for cols in allowlist.values():
        allowed_columns_global.update(cols)

    for col in parsed.find_all(exp.Column):
        col_name = col.name
        table_node = col.args.get("table")
        table_ref = table_node.name if hasattr(table_node, "name") else None

        if table_ref:
            real_table = scope_tables.get(table_ref, table_ref)
            if real_table in allowlist and col_name in allowlist[real_table]:
                continue
            # Fallback para CTEs e subqueries (tabela nao no allowlist)
            if real_table not in allowlist and col_name in allowed_columns_global:
                continue
            raise GuardrailError(
                f"Coluna '{col_name}' (tabela '{table_ref}') "
                f"nao pertence ao schema."
            )
        else:
            found = False
            for tbl_name in scope_tables.values():
                if tbl_name in allowlist and col_name in allowlist[tbl_name]:
                    found = True
                    break
            if not found and col_name in allowed_columns_global:
                found = True
            if not found:
                raise GuardrailError(
                    f"Coluna '{col_name}' nao pertence a nenhuma "
                    f"tabela do FROM/JOIN."
                )


def add_limit_if_missing(sql: str, max_rows: int) -> str:
    """
    Adiciona LIMIT max_rows ao final do SQL caso não exista.

    Preserva o ponto-e-vírgula final, se presente.

    Args:
        sql: Query SQL válido.
        max_rows: Número máximo de linhas a serem retornadas.

    Returns:
        SQL com LIMIT injetado no final, quando necessário.

    Raises:
        GuardrailError: Se o SQL não puder ser parseado.
    """
    try:
        parsed = sqlglot.parse_one(sql, read="sqlite")
    except Exception as exc:
        raise GuardrailError(
            f"Falha ao parsear SQL para verificar LIMIT: {exc}"
        ) from exc

    if parsed.find(exp.Limit):
        return sql

    stripped = sql.strip()
    if stripped.endswith(";"):
        return stripped[:-1].rstrip() + f" LIMIT {max_rows};"
    return stripped + f" LIMIT {max_rows}"
