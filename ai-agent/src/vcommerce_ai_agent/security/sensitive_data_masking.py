"""
Módulo de mascaramento reversível de dados sensíveis.

Responsável por trocar valores sensíveis por tokens temporários antes do
envio de dados ao LLM (Chamada 2), e por restaurar os valores reais na
resposta textual retornada pelo modelo.

A classificação de sensibilidade é determinística e baseada exclusivamente
nos metadados do arquivo `schema_descriptions.json`.
"""

import copy
import re
from dataclasses import dataclass
from typing import Any

from sqlglot import exp, parse_one

_MASK_LABEL_RE = re.compile(r"[^a-zA-Z0-9_]")

# Prefixos comuns removidos na derivação automática de mask_label
_COMMON_PREFIXES = {
    "nome",
    "email",
    "cpf",
    "telefone",
    "num",
    "cod",
    "id",
    "txt",
    "texto",
    "desc",
}


@dataclass
class MaskingResult:
    """Resultado do mascaramento de dados sensíveis."""

    llm_data: list[dict[str, Any]]
    token_to_value: dict[str, str]
    masked_columns: set[str]

    def __repr__(self) -> str:
        return (
            f"MaskingResult("
            f"llm_data=[{len(self.llm_data)} rows], "
            f"token_to_value=[{len(self.token_to_value)} tokens], "
            f"masked_columns={self.masked_columns}"
            f")"
        )


def _sanitize_mask_label(label: str) -> str:
    """Garante que o mask_label contenha apenas letras, números e underscore."""
    sanitized = _MASK_LABEL_RE.sub("", label)
    return sanitized if sanitized else "Campo"


def _derive_mask_label(column_name: str) -> str:
    """Deriva um mask_label legível a partir do nome da coluna."""
    parts = column_name.split("_")
    # Remove prefixos comuns se houver mais partes após
    while len(parts) > 1 and parts[0].lower() in _COMMON_PREFIXES:
        parts.pop(0)
    label = "".join(p.capitalize() for p in parts if p)
    return label if label else "Campo"


def _build_sensitive_index(
    descriptions: dict[str, Any],
) -> dict[tuple[str, str], str]:
    """Constrói índice (tabela, coluna) -> mask_label a partir das descrições."""
    index: dict[tuple[str, str], str] = {}
    tables = descriptions.get("tables", {})
    for table_name, table_meta in tables.items():
        columns = table_meta.get("columns", {})
        for col_name, col_meta in columns.items():
            if col_meta.get("sensitive") is True:
                mask_label = col_meta.get("mask_label")
                if not mask_label:
                    mask_label = _derive_mask_label(col_name)
                index[(table_name, col_name)] = _sanitize_mask_label(mask_label)
    return index


def _find_mask_label(
    col_name: str,
    table_ref: str | None,
    sensitive_index: dict[tuple[str, str], str],
) -> str | None:
    """Busca o mask_label de uma coluna no índice sensível."""
    if table_ref:
        return sensitive_index.get((table_ref, col_name))
    # Coluna sem qualificação: busca em todas as tabelas
    for (t, c), label in sensitive_index.items():
        if c == col_name:
            return label
    return None


def _resolve_table_alias(
    parsed: exp.Select,
) -> dict[str, str]:
    """Mapeia alias de tabela para nome real a partir do FROM/JOIN."""
    alias_map: dict[str, str] = {}
    for table in parsed.find_all(exp.Table):
        real_name = table.name
        alias = table.alias
        if alias:
            alias_map[alias] = real_name
        # Também mapeia o próprio nome (sem alias) para si mesmo
        alias_map[real_name] = real_name
    return alias_map


def _extract_sensitive_keys(
    sql: str,
    sensitive_index: dict[tuple[str, str], str],
) -> dict[str, str]:
    """
    Mapeia chaves do resultado da query para mask_labels.

    Versão base (Fase 2): cobre apenas projeções diretas de colunas
    e aliases simples. Expressões complexas e SELECT * são tratados
    nas fases seguintes.
    """
    try:
        parsed = parse_one(sql, read="sqlite")
    except Exception:
        return {}

    if not isinstance(parsed, exp.Select):
        return {}

    alias_map = _resolve_table_alias(parsed)
    result: dict[str, str] = {}

    for expr in parsed.expressions:
        # Projeção direta: SELECT nome_cliente
        if isinstance(expr, exp.Column):
            col_name = expr.name
            table_ref = expr.table if expr.table else None
            # Resolve alias para nome real da tabela
            resolved_ref = alias_map.get(table_ref, table_ref) if table_ref else None
            mask_label = _find_mask_label(col_name, resolved_ref, sensitive_index)
            if mask_label:
                result[col_name] = mask_label

        # Alias simples: SELECT nome_cliente AS cliente
        elif isinstance(expr, exp.Alias):
            alias_name = expr.alias
            inner = expr.this
            if isinstance(inner, exp.Column):
                col_name = inner.name
                table_ref = inner.table if inner.table else None
                resolved_ref = alias_map.get(table_ref, table_ref) if table_ref else None
                mask_label = _find_mask_label(col_name, resolved_ref, sensitive_index)
                if mask_label:
                    result[alias_name] = mask_label

    return result


def _tokenize(
    value: Any,
    mask_label: str,
    token_to_value: dict[str, str],
    counters: dict[str, int],
) -> Any:
    """Substitui um valor sensível por um token temporário."""
    if value is None:
        return None
    text = str(value)
    if text == "":
        return ""

    # Reutiliza token existente para o mesmo valor na mesma categoria
    for token, real in token_to_value.items():
        if real == text and token.startswith(f"{mask_label}_"):
            return token

    counters[mask_label] = counters.get(mask_label, 0) + 1
    token = f"{mask_label}_{counters[mask_label]}"
    token_to_value[token] = text
    return token


def mask_sensitive_data(
    data: list[dict[str, Any]],
    *,
    sql: str,
    descriptions: dict[str, Any],
) -> MaskingResult:
    """
    Mascara valores sensíveis antes de enviar dados ao LLM.

    Args:
        data: Linhas retornadas pelo banco (dados reais).
        sql: Query SQL validada que gerou os dados.
        descriptions: Metadados de negócio do schema.

    Returns:
        MaskingResult com dados mascarados, mapa de reversão e colunas afetadas.
    """
    sensitive_index = _build_sensitive_index(descriptions)
    if not sensitive_index or not data:
        return MaskingResult(
            llm_data=[copy.deepcopy(row) for row in data],
            token_to_value={},
            masked_columns=set(),
        )

    sensitive_keys = _extract_sensitive_keys(sql, sensitive_index)
    if not sensitive_keys:
        return MaskingResult(
            llm_data=[copy.deepcopy(row) for row in data],
            token_to_value={},
            masked_columns=set(),
        )

    token_to_value: dict[str, str] = {}
    counters: dict[str, int] = {}
    llm_data: list[dict[str, Any]] = []
    masked_columns: set[str] = set()

    for row in data:
        new_row = dict(row)
        for key, mask_label in sensitive_keys.items():
            if key in new_row:
                original = new_row[key]
                token = _tokenize(original, mask_label, token_to_value, counters)
                new_row[key] = token
                if token != original:
                    masked_columns.add(key)
        llm_data.append(new_row)

    return MaskingResult(
        llm_data=llm_data,
        token_to_value=token_to_value,
        masked_columns=masked_columns,
    )


def restore_sensitive_values(value: Any, token_to_value: dict[str, str]) -> Any:
    """
    Restaura tokens sensíveis em strings produzidas pelo LLM.

    Args:
        value: Valor (str, dict, list, etc.) possivelmente contendo tokens.
        token_to_value: Mapa token -> valor real.

    Returns:
        Valor com tokens substituídos pelos valores reais.
    """
    if not token_to_value:
        return value

    if isinstance(value, str):
        # Ordena por tamanho decrescente para evitar colisões parciais
        for token in sorted(token_to_value.keys(), key=len, reverse=True):
            value = value.replace(token, token_to_value[token])
        return value

    if isinstance(value, dict):
        return {
            k: restore_sensitive_values(v, token_to_value)
            for k, v in value.items()
        }

    if isinstance(value, list):
        return [
            restore_sensitive_values(item, token_to_value)
            for item in value
        ]

    return value
