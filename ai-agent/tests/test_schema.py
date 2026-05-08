"""
Testes unitários para o módulo schema.py.

Cobrem a construção do allowlist, formatação do schema para prompt
e exclusão de tabelas sensíveis.
"""

import pytest

from src.schema import build_allowlist, format_schema


@pytest.fixture
def sample_technical_schema() -> dict:
    return {
        "tables": {
            "clientes": {
                "columns": [
                    {"name": "id", "type": "INTEGER", "notnull": 1, "dflt_value": None, "pk": 1},
                    {"name": "nome", "type": "TEXT", "notnull": 1, "dflt_value": None, "pk": 0},
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
            "clientes": {
                "description": "Tabela de clientes da V-Commerce",
                "columns": {
                    "nome": {"description": "Nome completo do cliente", "examples": ["João Silva"]},
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
    assert set(result.keys()) == {"clientes", "usuarios"}
    assert result["clientes"] == {"id", "nome"}
    assert result["usuarios"] == {"id", "senha"}


def test_build_allowlist_excludes_tables(sample_technical_schema):
    result = build_allowlist(sample_technical_schema, excluded_tables={"usuarios"})
    assert set(result.keys()) == {"clientes"}
    assert "usuarios" not in result


def test_format_schema_includes_all_tables_by_default(sample_technical_schema, sample_descriptions):
    text = format_schema(sample_technical_schema, sample_descriptions)
    assert "CREATE TABLE clientes" in text
    assert "CREATE TABLE usuarios" in text
    assert "senha" in text


def test_format_schema_excludes_tables(sample_technical_schema, sample_descriptions):
    text = format_schema(
        sample_technical_schema,
        sample_descriptions,
        excluded_tables={"usuarios"},
    )
    assert "CREATE TABLE clientes" in text
    assert "CREATE TABLE usuarios" not in text
    assert "senha" not in text


def test_format_schema_omits_missing_descriptions(sample_technical_schema):
    text = format_schema(sample_technical_schema, {"tables": {}})
    assert "CREATE TABLE clientes" in text
    assert "CREATE TABLE usuarios" in text
    # Sem descrições, não há metadados extras
    assert "Descrição:" not in text
