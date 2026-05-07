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


def load_descriptions() -> dict[str, Any]:
    """
    Carrega e parseia o arquivo `schema_descriptions.json`.

    Returns:
        Dicionário com a estrutura de metadados de negócio.

    Raises:
        FileNotFoundError: Se o arquivo JSON não for encontrado.
        ValueError: Se o conteúdo não for um JSON válido.
    """
    if not _DESCRIPTIONS_PATH.exists():
        raise FileNotFoundError(
            f"Arquivo de descrições não encontrado: {_DESCRIPTIONS_PATH}"
        )

    try:
        with _DESCRIPTIONS_PATH.open("r", encoding="utf-8") as f:
            return json.load(f)  # type: ignore[no-any-return]
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Falha ao parsear {_DESCRIPTIONS_PATH}: {exc}"
        ) from exc


def format_schema(technical_schema: dict[str, Any], descriptions: dict[str, Any]) -> str:
    """
    Combina schema técnico + metadados de negócio em um texto formatado.

    Para cada tabela presente no banco, o texto inclui:
    - O CREATE TABLE statement reconstruído a partir do schema técnico.
    - A descrição da tabela (quando disponível no JSON).
    - Para cada coluna: tipo, descrição e exemplos de valores.

    Tabelas sem entrada em `schema_descriptions.json` são incluídas
    apenas com o schema técnico.

    Args:
        technical_schema: Saída de `Database.get_technical_schema()`.
        descriptions: Saída de `load_descriptions()`.

    Returns:
        Texto único pronto para ser injetado no system prompt do LLM.
    """
    tables_meta = descriptions.get("tables", {})
    output_lines: list[str] = []
    output_lines.append("## Schema do Banco de Dados")
    output_lines.append("")

    for table_name, table_info in technical_schema.get("tables", {}).items():
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
            default = f" DEFAULT {col['dflt_value']}" if col.get("dflt_value") is not None else ""
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
