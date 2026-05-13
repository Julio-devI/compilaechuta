"""
Testes unitários para o módulo schema.py.

Cobrem a construção do allowlist, formatação do schema para prompt
e exclusão de tabelas sensíveis.
"""

import pytest

from vcommerce_ai_agent.database.schema import (
    build_allowlist,
    format_schema,
    load_descriptions,
    validate_descriptions,
)


@pytest.fixture
def sample_technical_schema() -> dict:
    return {
        "tables": {
            "dim_cliente": {
                "columns": [
                    {"name": "id", "type": "INTEGER", "notnull": 1, "dflt_value": None, "pk": 1},
                    {"name": "nome_cliente", "type": "TEXT", "notnull": 1, "dflt_value": None, "pk": 0},
                ],
                "primary_keys": ["id"],
                "foreign_keys": [],
            },
            "usuarios": {
                "columns": [
                    {"name": "id", "type": "INTEGER", "notnull": 1, "dflt_value": None, "pk": 1},
                    {"name": "senha", "type": "TEXT", "notnull": 1, "dflt_value": None, "pk": 0},
                ],
                "primary_keys": ["id"],
                "foreign_keys": [],
            },
        }
    }


@pytest.fixture
def sample_descriptions() -> dict:
    return {
        "tables": {
            "dim_cliente": {
                "description": "Tabela de dim_cliente da V-Commerce",
                "columns": {
                    "nome_cliente": {"description": "Nome completo do cliente", "examples": ["João Silva"]},
                },
            },
            "usuarios": {
                "description": "Tabela de usuários do sistema (sensível)",
                "columns": {
                    "senha": {"description": "Hash da senha", "examples": []},
                },
            },
        }
    }


def test_build_allowlist_includes_all_tables_by_default(sample_technical_schema):
    result = build_allowlist(sample_technical_schema)
    assert set(result.keys()) == {"dim_cliente", "usuarios"}
    assert result["dim_cliente"] == {"id", "nome_cliente"}
    assert result["usuarios"] == {"id", "senha"}


def test_build_allowlist_excludes_tables(sample_technical_schema):
    result = build_allowlist(sample_technical_schema, excluded_tables={"usuarios"})
    assert set(result.keys()) == {"dim_cliente"}
    assert "usuarios" not in result


def test_format_schema_includes_all_tables_by_default(sample_technical_schema, sample_descriptions):
    text = format_schema(sample_technical_schema, sample_descriptions)
    assert "CREATE TABLE dim_cliente" in text
    assert "CREATE TABLE usuarios" in text
    assert "senha" in text


def test_format_schema_excludes_tables(sample_technical_schema, sample_descriptions):
    text = format_schema(
        sample_technical_schema,
        sample_descriptions,
        excluded_tables={"usuarios"},
    )
    assert "CREATE TABLE dim_cliente" in text
    assert "CREATE TABLE usuarios" not in text
    assert "senha" not in text


def test_format_schema_omits_missing_descriptions(sample_technical_schema):
    text = format_schema(sample_technical_schema, {"tables": {}})
    assert "CREATE TABLE dim_cliente" in text
    assert "CREATE TABLE usuarios" in text
    # Sem descrições, não há metadados extras
    assert "Descrição:" not in text


def test_validate_descriptions_accepts_valid_structure(sample_descriptions):
    validate_descriptions(sample_descriptions)


@pytest.mark.parametrize(
    ("payload", "expected_message"),
    [
        ([], "objeto JSON"),
        ({}, "'tables' deve ser um objeto"),
        ({"tables": []}, "'tables' deve ser um objeto"),
        ({"tables": {"": {}}}, "Nomes de tabelas"),
        ({"tables": {"dim_cliente": []}}, "Metadados da tabela"),
        (
            {"tables": {"dim_cliente": {"display_name": 123}}},
            "display_name",
        ),
        (
            {"tables": {"dim_cliente": {"description": 123}}},
            "description",
        ),
        (
            {"tables": {"dim_cliente": {"columns": []}}},
            "columns' deve ser um objeto",
        ),
        (
            {"tables": {"dim_cliente": {"columns": {"": {}}}}},
            "Nomes de colunas",
        ),
        (
            {"tables": {"dim_cliente": {"columns": {"nome": []}}}},
            "Metadados da coluna",
        ),
        (
            {"tables": {"dim_cliente": {"columns": {"nome": {"examples": "x"}}}}},
            "examples",
        ),
    ],
)
def test_validate_descriptions_rejects_invalid_structure(payload, expected_message):
    with pytest.raises(ValueError, match=expected_message):
        validate_descriptions(payload)


def test_load_descriptions_accepts_external_file(tmp_path):
    descriptions_path = tmp_path / "schema_descriptions.json"
    descriptions_path.write_text(
        """
        {
          "tables": {
            "dim_cliente": {
              "display_name": "clientes",
              "description": "Tabela de clientes.",
              "columns": {
                "nome_cliente": {
                  "description": "Nome do cliente.",
                  "examples": ["Ana"]
                }
              }
            }
          }
        }
        """,
        encoding="utf-8",
    )

    result = load_descriptions(descriptions_path)

    assert result["tables"]["dim_cliente"]["display_name"] == "clientes"


def test_load_descriptions_rejects_external_file_with_invalid_structure(tmp_path):
    descriptions_path = tmp_path / "schema_descriptions.json"
    descriptions_path.write_text('{"tables": []}', encoding="utf-8")

    with pytest.raises(ValueError, match="'tables' deve ser um objeto"):
        load_descriptions(descriptions_path)
