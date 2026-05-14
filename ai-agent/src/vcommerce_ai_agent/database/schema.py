"""
Módulo de schema.

Combina o schema técnico extraído automaticamente do banco SQLite
com os metadados de negócio mantidos manualmente em
`schema_descriptions.json`, produzindo um texto único a ser injetado
nos prompts do LLM.
"""

import json
from pathlib import Path
from typing import Any

_DESCRIPTIONS_PATH = Path(__file__).resolve().parent / "schema_descriptions.json"


def _validate_optional_string(value: Any, field_path: str) -> None:
    """Valida campos textuais opcionais do arquivo de descrições."""
    if value is not None and not isinstance(value, str):
        raise ValueError(f"Campo '{field_path}' deve ser uma string.")


def validate_descriptions(descriptions: dict[str, Any]) -> None:
    """
    Valida a estrutura mínima do `schema_descriptions.json`.

    Estrutura esperada:
    {
      "tables": {
        "nome_tabela": {
          "display_name": "Nome exibível",
          "description": "Descrição da tabela",
          "columns": {
            "nome_coluna": {
              "description": "Descrição da coluna",
              "examples": ["valor1", 2, ...]
            }
          }
        }
      }
    }

    Raises:
        ValueError: Se a estrutura não seguir o contrato esperado.
    """
    if not isinstance(descriptions, dict):
        raise ValueError("Arquivo de descrições deve conter um objeto JSON.")

    tables = descriptions.get("tables")
    if not isinstance(tables, dict):
        raise ValueError("Campo obrigatório 'tables' deve ser um objeto.")

    for table_name, table_meta in tables.items():
        if not isinstance(table_name, str) or not table_name.strip():
            raise ValueError("Nomes de tabelas em 'tables' devem ser strings não vazias.")
        if not isinstance(table_meta, dict):
            raise ValueError(f"Metadados da tabela '{table_name}' devem ser um objeto.")

        _validate_optional_string(
            table_meta.get("display_name"),
            f"tables.{table_name}.display_name",
        )
        _validate_optional_string(
            table_meta.get("description"),
            f"tables.{table_name}.description",
        )

        columns = table_meta.get("columns", {})
        if columns is None:
            continue
        if not isinstance(columns, dict):
            raise ValueError(f"Campo 'tables.{table_name}.columns' deve ser um objeto.")

        for column_name, column_meta in columns.items():
            if not isinstance(column_name, str) or not column_name.strip():
                raise ValueError(
                    f"Nomes de colunas em 'tables.{table_name}.columns' "
                    "devem ser strings não vazias."
                )
            if not isinstance(column_meta, dict):
                raise ValueError(
                    f"Metadados da coluna 'tables.{table_name}.columns.{column_name}' "
                    "devem ser um objeto."
                )
            _validate_optional_string(
                column_meta.get("description"),
                f"tables.{table_name}.columns.{column_name}.description",
            )
            examples = column_meta.get("examples")
            if examples is not None and not isinstance(examples, list):
                raise ValueError(
                    f"Campo 'tables.{table_name}.columns.{column_name}.examples' "
                    "deve ser uma lista."
                )


def load_descriptions(
    schema_descriptions_path: str | Path | None = None,
) -> dict[str, Any]:
    """
    Carrega e parseia o arquivo `schema_descriptions.json`.

    Quando `schema_descriptions_path` é informado, carrega esse arquivo externo.
    Caso contrário, usa o JSON padrão empacotado com o módulo.

    Returns:
        Dicionário com a estrutura de metadados de negócio.

    Raises:
        FileNotFoundError: Se o arquivo JSON não for encontrado.
        ValueError: Se o conteúdo não for um JSON válido.
    """
    descriptions_path = (
        Path(schema_descriptions_path)
        if schema_descriptions_path is not None
        else _DESCRIPTIONS_PATH
    )

    if not descriptions_path.exists():
        raise FileNotFoundError(
            f"Arquivo de descrições não encontrado: {descriptions_path}"
        )

    try:
        with descriptions_path.open("r", encoding="utf-8") as f:
            descriptions = json.load(f)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Falha ao parsear {descriptions_path}: {exc}"
        ) from exc

    validate_descriptions(descriptions)
    return descriptions  # type: ignore[no-any-return]


def format_schema(
    technical_schema: dict[str, Any],
    descriptions: dict[str, Any],
    excluded_tables: set[str] | None = None,
) -> str:
    """
    Combina schema técnico + metadados de negócio em um texto formatado.

    Para cada tabela presente no banco (exceto as em `excluded_tables`),
    o texto inclui:
    - O CREATE TABLE statement reconstruído a partir do schema técnico.
    - A descrição da tabela (quando disponível no JSON).
    - Para cada coluna: tipo, descrição e exemplos de valores.

    Tabelas sem entrada em `schema_descriptions.json` são incluídas
    apenas com o schema técnico.

    Args:
        technical_schema: Saída de `Database.get_technical_schema()`.
        descriptions: Saída de `load_descriptions()`.
        excluded_tables: Conjunto de nomes de tabelas a omitir do texto.

    Returns:
        Texto único pronto para ser injetado no system prompt do LLM.
    """
    excluded = excluded_tables or set()
    tables_meta = descriptions.get("tables", {})
    output_lines: list[str] = []
    output_lines.append("## Schema do Banco de Dados")
    output_lines.append("")

    for table_name, table_info in technical_schema.get("tables", {}).items():
        if table_name in excluded:
            continue
        cols = table_info.get("columns", [])
        fks = table_info.get("foreign_keys", [])
        meta = tables_meta.get(table_name, {})

        # CREATE TABLE reconstruído
        output_lines.append(f"CREATE TABLE {table_name} (")
        col_defs: list[str] = []
        for col in cols:
            col_name = col["name"]
            col_type = col["type"]
            not_null = " NOT NULL" if col.get("notnull") else ""
            if col.get("dflt_value") is not None:
                val = col["dflt_value"]
                default = f" DEFAULT {val}"  # SQLite já retorna com aspas para strings
            else:
                default = ""
            pk_marker = " PRIMARY KEY" if col.get("pk") else ""
            col_defs.append(f"    {col_name} {col_type}{not_null}{default}{pk_marker}")

        # FKs como constraints inline (simplificado)
        for fk in fks:
            col_defs.append(
                f"    FOREIGN KEY ({fk['from']}) REFERENCES {fk['table']}({fk['to']})"
            )

        output_lines.append(",\n".join(col_defs))
        output_lines.append(");")
        output_lines.append("")

        # Descrição da tabela
        table_desc = meta.get("description")
        if table_desc:
            output_lines.append(f"-- Descrição: {table_desc}")

        # Descrição e exemplos por coluna
        col_meta = meta.get("columns", {})
        for col in cols:
            col_name = col["name"]
            cm = col_meta.get(col_name, {})
            desc = cm.get("description")
            examples = cm.get("examples")
            parts: list[str] = [f"--   {col_name} ({col['type']})"]
            if desc:
                parts.append(f"- {desc}")
            if examples:
                examples_str = ", ".join(str(e) for e in examples)
                parts.append(f"Exemplos: {examples_str}")
            output_lines.append(" ".join(parts))

        output_lines.append("")

    return "\n".join(output_lines)


def build_allowlist(
    technical_schema: dict[str, Any], excluded_tables: set[str] | None = None
) -> dict[str, set[str]]:
    """
    Constrói o allowlist de tabelas e colunas a partir do schema técnico em memória.

    Args:
        technical_schema: Saída de Database.get_technical_schema().
        excluded_tables: Conjunto opcional de nomes de tabelas a serem omitidas
            do allowlist (ex.: tabelas sensíveis como usuários, auditoria).

    Returns:
        Dicionário mapeando nome da tabela para um conjunto de nomes de colunas.
    """
    excluded = excluded_tables or set()
    allowlist: dict[str, set[str]] = {}
    for table_name, table_info in technical_schema.get("tables", {}).items():
        if table_name in excluded:
            continue
        columns = {col["name"] for col in table_info.get("columns", [])}
        allowlist[table_name] = columns
    return allowlist
