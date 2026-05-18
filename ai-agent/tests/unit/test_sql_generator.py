"""
Testes unitários para o módulo de geração de SQL (Chamada 1).

Esta suite cobre o parser de SQL, a validação sintática mínima
(e seu tratamento de comentários) e a extração de blocos markdown.
"""

import pytest

from vcommerce_ai_agent.core import config
from vcommerce_ai_agent.llm.sql_generator import (
    _extract_out_of_scope,
    _load_system_prompt,
    _strip_sql_comments,
    _validate_sql_response,
    _validate_syntax,
)


# ---------------------------------------------------------------------------
# _strip_sql_comments
# ---------------------------------------------------------------------------


def test_strip_sql_comments_removes_line_comment():
    sql = "-- comentario\nSELECT * FROM dim_cliente"
    result = _strip_sql_comments(sql)
    assert result == "SELECT * FROM dim_cliente"


def test_strip_sql_comments_removes_block_comment():
    sql = "/* bloco */\nSELECT * FROM dim_cliente"
    result = _strip_sql_comments(sql)
    assert result == "SELECT * FROM dim_cliente"


def test_strip_sql_comments_removes_multiline_block_comment():
    sql = "/* multi\nlinha */\nWITH cte AS (SELECT 1) SELECT * FROM cte"
    result = _strip_sql_comments(sql)
    assert result == "WITH cte AS (SELECT 1) SELECT * FROM cte"


def test_strip_sql_comments_preserves_no_comment():
    sql = "SELECT * FROM dim_cliente"
    result = _strip_sql_comments(sql)
    assert result == "SELECT * FROM dim_cliente"


def test_strip_sql_comments_removes_inline_line_comment():
    sql = "SELECT * FROM dim_cliente -- filtro ativo"
    result = _strip_sql_comments(sql)
    assert result == "SELECT * FROM dim_cliente"


def test_strip_sql_comments_removes_inline_block_comment():
    sql = "SELECT /* colunas */ * FROM dim_cliente"
    result = _strip_sql_comments(sql)
    assert result == "SELECT  * FROM dim_cliente"


# ---------------------------------------------------------------------------
# _validate_syntax (inclui comentários)
# ---------------------------------------------------------------------------


def test_validate_syntax_accepts_simple_select():
    _validate_syntax("SELECT * FROM dim_cliente")


def test_validate_syntax_accepts_with_cte():
    _validate_syntax("WITH cte AS (SELECT 1) SELECT * FROM cte")


def test_validate_syntax_accepts_select_with_line_comment():
    _validate_syntax("-- comentario\nSELECT * FROM dim_cliente")


def test_validate_syntax_accepts_select_with_block_comment():
    _validate_syntax("/* bloco */\nSELECT * FROM dim_cliente")


def test_validate_syntax_accepts_with_multiline_comment():
    _validate_syntax("/* multi\nlinha */\nWITH cte AS (SELECT 1) SELECT * FROM cte")


def test_validate_syntax_rejects_drop():
    with pytest.raises(ValueError, match="SELECT válido"):
        _validate_syntax("DROP TABLE dim_cliente")


def test_validate_syntax_rejects_drop_after_comment():
    with pytest.raises(ValueError, match="SELECT válido"):
        _validate_syntax("-- comentario\nDROP TABLE dim_cliente")


def test_validate_syntax_rejects_delete():
    with pytest.raises(ValueError, match="SELECT válido"):
        _validate_syntax("DELETE FROM dim_cliente")


def test_validate_syntax_rejects_insert():
    with pytest.raises(ValueError, match="SELECT válido"):
        _validate_syntax("INSERT INTO dim_cliente VALUES (1)")


def test_validate_syntax_rejects_update():
    with pytest.raises(ValueError, match="SELECT válido"):
        _validate_syntax("UPDATE dim_cliente SET nome = 'x'")


def test_validate_syntax_accepts_subquery_with_parens():
    _validate_syntax("(SELECT * FROM dim_cliente)")


def test_validate_syntax_accepts_select_after_multiple_parens():
    _validate_syntax("(((SELECT * FROM dim_cliente)))")


def test_extract_out_of_scope_from_plain_marker():
    raw = "FORA_DO_ESCOPO Pergunta fora do dominio."
    assert _extract_out_of_scope(raw) == raw


def test_extract_out_of_scope_from_markdown_fence():
    raw = "```text\nFORA_DO_ESCOPO Pergunta fora do dominio.\n```"
    assert (
        _extract_out_of_scope(raw)
        == "FORA_DO_ESCOPO Pergunta fora do dominio."
    )


def test_extract_out_of_scope_from_prose_response():
    raw = "Não posso responder.\nFORA_DO_ESCOPO Tabelas ocultas não estão disponíveis."
    assert (
        _extract_out_of_scope(raw)
        == "FORA_DO_ESCOPO Tabelas ocultas não estão disponíveis."
    )


def test_validate_sql_response_accepts_wrapped_out_of_scope():
    _validate_sql_response(
        f"```text\n{config.OUT_OF_SCOPE_MARKER} Tabelas ocultas não estão disponíveis.\n```"
    )


def test_sql_system_prompt_guides_temporal_follow_ups():
    prompt = _load_system_prompt("schema", "historico")

    assert "comparado com os anteriores" in prompt
    assert "períodos anteriores comparáveis" in prompt
    assert "vedas" in prompt


def test_sql_system_prompt_injects_initial_context():
    prompt = _load_system_prompt(
        "schema",
        initial_context="Tela de clientes aberta no drawer.",
    )

    assert "## Contexto Inicial da Tela" in prompt
    assert "Tela de clientes aberta no drawer." in prompt
    assert "não restringe o escopo da conversa" in prompt


def test_sql_system_prompt_omits_initial_context_when_empty():
    prompt = _load_system_prompt("schema")

    assert "## Contexto Inicial da Tela" not in prompt
    assert "{initial_context}" not in prompt
