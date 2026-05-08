"""
Testes unitários para os guardrails de segurança.

Esta suite cobre a Camada 2 (etapa 1): remoção de comentários,
bloqueio de queries destrutivas e detecção de múltiplos statements.
Testes adicionais (allowlist, validação semântica, input do usuário)
são adicionados nos commits seguintes.
"""

import pytest

from src.guardrails import (
    strip_sql_comments,
    validate_destructive_queries,
    validate_empty_input,
    validate_input_length,
    validate_multiple_statements,
)
from src.exceptions import GuardrailError
from src.config import MAX_INPUT_CHARS


# ---------------------------------------------------------------------------
# strip_sql_comments
# ---------------------------------------------------------------------------


def test_strip_sql_comments_removes_line_comments():
    sql = "SELECT 1 -- comentario de linha\nFROM t"
    result = strip_sql_comments(sql)
    assert "--" not in result
    assert "comentario" not in result
    assert "SELECT 1" in result
    assert "FROM t" in result


def test_strip_sql_comments_removes_block_comments():
    sql = "SELECT /* comentario de bloco */ 1 FROM t"
    result = strip_sql_comments(sql)
    assert "/*" not in result
    assert "*/" not in result
    assert "comentario" not in result
    assert "SELECT  1 FROM t" in result


def test_strip_sql_comments_removes_multiline_block():
    sql = """SELECT 1
    /* comentario
       multilinha */
    FROM t"""
    result = strip_sql_comments(sql)
    assert "/*" not in result
    assert "multilinha" not in result
    assert "SELECT 1" in result
    assert "FROM t" in result


def test_strip_sql_comments_no_comments_unchanged():
    sql = "SELECT 1 FROM t"
    assert strip_sql_comments(sql) == sql


def test_strip_sql_comments_hides_destructive_command():
    """Comentários podem esconder comandos destrutivos — strip deve expor."""
    sql = "SELECT 1; --\nDROP TABLE t"
    result = strip_sql_comments(sql)
    assert "DROP" in result


def test_strip_sql_comments_block_hides_destructive():
    sql = "SELECT 1 /* DROP TABLE t */ FROM t"
    result = strip_sql_comments(sql)
    assert "DROP" not in result


# ---------------------------------------------------------------------------
# validate_destructive_queries
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "command",
    [
        "DELETE",
        "DROP",
        "UPDATE",
        "INSERT",
        "ALTER",
        "TRUNCATE",
        "CREATE",
        "REPLACE",
        "ATTACH",
        "DETACH",
        "PRAGMA",
        "VACUUM",
    ],
)
def test_validate_destructive_queries_blocks_commands(command):
    sql = f"{command} TABLE t"
    with pytest.raises(GuardrailError) as exc_info:
        validate_destructive_queries(sql)
    assert command in str(exc_info.value)


def test_validate_destructive_queries_allows_select():
    sql = "SELECT * FROM t"
    # Nao deve levantar excecao
    validate_destructive_queries(sql)


def test_validate_destructive_queries_allows_with():
    sql = "WITH cte AS (SELECT 1) SELECT * FROM cte"
    validate_destructive_queries(sql)


def test_validate_destructive_queries_case_insensitive():
    sql = "delete from t"
    with pytest.raises(GuardrailError) as exc_info:
        validate_destructive_queries(sql)
    assert "DELETE" in str(exc_info.value)


def test_validate_destructive_queries_blocks_after_comment_strip():
    sql = "SELECT 1; /* comentario */ DROP TABLE t"
    cleaned = strip_sql_comments(sql)
    with pytest.raises(GuardrailError):
        validate_destructive_queries(cleaned)


# ---------------------------------------------------------------------------
# validate_multiple_statements
# ---------------------------------------------------------------------------


def test_validate_multiple_statements_detects_semicolon():
    sql = "SELECT 1; DROP TABLE t"
    with pytest.raises(GuardrailError) as exc_info:
        validate_multiple_statements(sql)
    assert "Multiplos statements" in str(exc_info.value)


def test_validate_multiple_statements_allows_single():
    sql = "SELECT * FROM t"
    validate_multiple_statements(sql)


def test_validate_multiple_statements_allows_trailing_semicolon():
    sql = "SELECT * FROM t;"
    validate_multiple_statements(sql)


def test_validate_multiple_statements_allows_whitespace_after_semicolon():
    sql = "SELECT * FROM t;   "
    validate_multiple_statements(sql)


# ---------------------------------------------------------------------------
# Camada 1 — validação do input do usuário
# ---------------------------------------------------------------------------


def test_validate_empty_input_rejects_empty_string():
    with pytest.raises(GuardrailError):
        validate_empty_input("")


def test_validate_empty_input_rejects_whitespace_only():
    with pytest.raises(GuardrailError):
        validate_empty_input("   \n\t  ")


def test_validate_empty_input_accepts_valid_question():
    # Não deve levantar exceção
    validate_empty_input("Quais os 10 produtos mais vendidos?")


def test_validate_input_length_rejects_too_long():
    long_input = "x" * (MAX_INPUT_CHARS + 1)
    with pytest.raises(GuardrailError) as exc_info:
        validate_input_length(long_input)
    assert str(MAX_INPUT_CHARS) in str(exc_info.value)


def test_validate_input_length_accepts_exact_limit():
    exact_input = "x" * MAX_INPUT_CHARS
    validate_input_length(exact_input)


def test_validate_input_length_accepts_shorter():
    short_input = "Quais os 10 produtos mais vendidos?"
    validate_input_length(short_input)
