"""
Testes unitários para o módulo de mascaramento reversível de dados sensíveis.
"""

import pytest

from vcommerce_ai_agent.security.sensitive_data_masking import (
    MaskingResult,
    mask_sensitive_data,
    restore_sensitive_values,
)


@pytest.fixture
def sample_descriptions() -> dict:
    return {
        "tables": {
            "dim_cliente": {
                "columns": {
                    "id_cliente": {"description": "ID"},
                    "nome_cliente": {
                        "description": "Nome",
                        "sensitive": True,
                        "mask_label": "Cliente",
                    },
                    "email": {
                        "description": "Email",
                        "sensitive": True,
                        "mask_label": "Email",
                    },
                    "regiao": {"description": "Região"},
                }
            },
            "fato_vendas": {
                "columns": {
                    "id_pedido": {"description": "Pedido"},
                    "valor_total_venda": {"description": "Valor"},
                }
            },
        }
    }


# ---------------------------------------------------------------------------
# Mascaramento básico
# ---------------------------------------------------------------------------


def test_mask_no_sensitive_columns_returns_unchanged():
    descriptions = {
        "tables": {
            "fato_vendas": {
                "columns": {
                    "id_pedido": {"description": "Pedido"},
                    "valor_total_venda": {"description": "Valor"},
                }
            }
        }
    }
    data = [{"id_pedido": "P1", "valor_total_venda": 100.0}]
    result = mask_sensitive_data(
        data, sql="SELECT id_pedido, valor_total_venda FROM fato_vendas", descriptions=descriptions
    )
    assert result.llm_data == data
    assert result.token_to_value == {}
    assert result.masked_columns == set()


def test_mask_empty_data_returns_empty():
    result = mask_sensitive_data(
        [], sql="SELECT nome_cliente FROM dim_cliente", descriptions={"tables": {}}
    )
    assert result.llm_data == []
    assert result.token_to_value == {}


def test_mask_direct_sensitive_column(sample_descriptions):
    data = [{"nome_cliente": "João Silva", "regiao": "Sudeste"}]
    result = mask_sensitive_data(
        data,
        sql="SELECT nome_cliente, regiao FROM dim_cliente",
        descriptions=sample_descriptions,
    )
    assert result.llm_data[0]["nome_cliente"] == "Cliente_1"
    assert result.llm_data[0]["regiao"] == "Sudeste"
    assert result.token_to_value == {"Cliente_1": "João Silva"}
    assert result.masked_columns == {"nome_cliente"}


def test_mask_alias_sensitive_column(sample_descriptions):
    data = [{"cliente": "Maria Souza", "regiao": "Nordeste"}]
    result = mask_sensitive_data(
        data,
        sql="SELECT nome_cliente AS cliente, regiao FROM dim_cliente",
        descriptions=sample_descriptions,
    )
    assert result.llm_data[0]["cliente"] == "Cliente_1"
    assert result.llm_data[0]["regiao"] == "Nordeste"
    assert result.token_to_value == {"Cliente_1": "Maria Souza"}
    assert result.masked_columns == {"cliente"}


def test_mask_two_sensitive_columns_same_row(sample_descriptions):
    data = [{"nome_cliente": "Ana", "email": "ana@example.com"}]
    result = mask_sensitive_data(
        data,
        sql="SELECT nome_cliente, email FROM dim_cliente",
        descriptions=sample_descriptions,
    )
    assert result.llm_data[0]["nome_cliente"] == "Cliente_1"
    assert result.llm_data[0]["email"] == "Email_1"
    assert result.token_to_value == {
        "Cliente_1": "Ana",
        "Email_1": "ana@example.com",
    }
    assert result.masked_columns == {"nome_cliente", "email"}


def test_mask_reuses_token_for_same_value(sample_descriptions):
    data = [
        {"nome_cliente": "Carlos", "regiao": "Sul"},
        {"nome_cliente": "Carlos", "regiao": "Norte"},
    ]
    result = mask_sensitive_data(
        data,
        sql="SELECT nome_cliente, regiao FROM dim_cliente",
        descriptions=sample_descriptions,
    )
    assert result.llm_data[0]["nome_cliente"] == "Cliente_1"
    assert result.llm_data[1]["nome_cliente"] == "Cliente_1"
    assert result.token_to_value == {"Cliente_1": "Carlos"}


def test_mask_increments_token_for_different_values(sample_descriptions):
    data = [
        {"nome_cliente": "Pedro"},
        {"nome_cliente": "Paulo"},
    ]
    result = mask_sensitive_data(
        data,
        sql="SELECT nome_cliente FROM dim_cliente",
        descriptions=sample_descriptions,
    )
    assert result.llm_data[0]["nome_cliente"] == "Cliente_1"
    assert result.llm_data[1]["nome_cliente"] == "Cliente_2"
    assert result.token_to_value == {
        "Cliente_1": "Pedro",
        "Cliente_2": "Paulo",
    }


def test_mask_same_text_different_categories_get_different_tokens(sample_descriptions):
    data = [{"nome_cliente": "ana@example.com", "email": "ana@example.com"}]
    result = mask_sensitive_data(
        data,
        sql="SELECT nome_cliente, email FROM dim_cliente",
        descriptions=sample_descriptions,
    )
    assert result.llm_data[0]["nome_cliente"] == "Cliente_1"
    assert result.llm_data[0]["email"] == "Email_1"
    assert result.token_to_value == {
        "Cliente_1": "ana@example.com",
        "Email_1": "ana@example.com",
    }


def test_mask_treats_none_as_none(sample_descriptions):
    data = [{"nome_cliente": None, "regiao": "Sudeste"}]
    result = mask_sensitive_data(
        data,
        sql="SELECT nome_cliente, regiao FROM dim_cliente",
        descriptions=sample_descriptions,
    )
    assert result.llm_data[0]["nome_cliente"] is None
    assert result.token_to_value == {}


def test_mask_treats_empty_string_as_empty(sample_descriptions):
    data = [{"nome_cliente": "", "regiao": "Sudeste"}]
    result = mask_sensitive_data(
        data,
        sql="SELECT nome_cliente, regiao FROM dim_cliente",
        descriptions=sample_descriptions,
    )
    assert result.llm_data[0]["nome_cliente"] == ""
    assert result.token_to_value == {}


def test_mask_does_not_mutate_original_rows(sample_descriptions):
    data = [{"nome_cliente": "João", "regiao": "Sul"}]
    result = mask_sensitive_data(
        data,
        sql="SELECT nome_cliente, regiao FROM dim_cliente",
        descriptions=sample_descriptions,
    )
    assert data[0]["nome_cliente"] == "João"
    assert result.llm_data[0]["nome_cliente"] == "Cliente_1"


def test_mask_resolves_table_alias(sample_descriptions):
    data = [{"cliente": "Maria Souza"}]
    result = mask_sensitive_data(
        data,
        sql="SELECT c.nome_cliente AS cliente FROM dim_cliente c",
        descriptions=sample_descriptions,
    )
    assert result.llm_data[0]["cliente"] == "Cliente_1"
    assert result.token_to_value == {"Cliente_1": "Maria Souza"}


def test_mask_resolves_table_alias_without_alias_in_projection(sample_descriptions):
    data = [{"nome_cliente": "Carlos"}]
    result = mask_sensitive_data(
        data,
        sql="SELECT c.nome_cliente FROM dim_cliente c",
        descriptions=sample_descriptions,
    )
    assert result.llm_data[0]["nome_cliente"] == "Cliente_1"
    assert result.token_to_value == {"Cliente_1": "Carlos"}


# ---------------------------------------------------------------------------
# Derivação de mask_label
# ---------------------------------------------------------------------------


def test_derive_mask_label_without_explicit_mask_label():
    descriptions = {
        "tables": {
            "dim_cliente": {
                "columns": {
                    "nome_cliente": {
                        "description": "Nome",
                        "sensitive": True,
                    }
                }
            }
        }
    }
    data = [{"nome_cliente": "Maria"}]
    result = mask_sensitive_data(
        data,
        sql="SELECT nome_cliente FROM dim_cliente",
        descriptions=descriptions,
    )
    # Derivação remove o prefixo "nome_" e capitaliza
    assert result.llm_data[0]["nome_cliente"] == "Cliente_1"
    assert result.token_to_value == {"Cliente_1": "Maria"}


# ---------------------------------------------------------------------------
# Restauração de valores
# ---------------------------------------------------------------------------


def test_restore_simple_string():
    token_map = {"Cliente_1": "Ana Silva"}
    assert restore_sensitive_values("Cliente_1 comprou 2 itens.", token_map) == "Ana Silva comprou 2 itens."


def test_restore_multiple_tokens():
    token_map = {"Cliente_1": "Ana", "Email_1": "ana@example.com"}
    text = "Cliente_1 tem email Email_1"
    assert restore_sensitive_values(text, token_map) == "Ana tem email ana@example.com"


def test_restore_nested_dict():
    token_map = {"Cliente_1": "Pedro"}
    data = {
        "title": "Cliente_1",
        "content": "Dados de Cliente_1",
        "nested": {"name": "Cliente_1"},
    }
    result = restore_sensitive_values(data, token_map)
    assert result["title"] == "Pedro"
    assert result["content"] == "Dados de Pedro"
    assert result["nested"]["name"] == "Pedro"


def test_restore_does_not_alter_dict_keys():
    token_map = {"Cliente_1": "Pedro"}
    data = {"Cliente_1": "valor"}
    result = restore_sensitive_values(data, token_map)
    assert "Cliente_1" in result
    assert result["Cliente_1"] == "valor"


def test_restore_list():
    token_map = {"Cliente_1": "Ana"}
    data = ["Cliente_1", {"nome": "Cliente_1"}]
    result = restore_sensitive_values(data, token_map)
    assert result == ["Ana", {"nome": "Ana"}]


def test_restore_unknown_token_unchanged():
    token_map = {"Cliente_1": "Ana"}
    assert restore_sensitive_values("Cliente_2", token_map) == "Cliente_2"


def test_restore_none():
    assert restore_sensitive_values(None, {"Cliente_1": "Ana"}) is None


def test_restore_numeric():
    assert restore_sensitive_values(42, {"Cliente_1": "Ana"}) == 42


def test_restore_boolean():
    assert restore_sensitive_values(True, {"Cliente_1": "Ana"}) is True


def test_restore_empty_token_map():
    assert restore_sensitive_values("texto", {}) == "texto"
