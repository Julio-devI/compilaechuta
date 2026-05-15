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
from sqlglot.optimizer.scope import traverse_scope

from vcommerce_ai_agent.core.exceptions import ErrorCode, GuardrailError
from vcommerce_ai_agent.core.logger import logger

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


def _raise_masking_error(message: str) -> None:
    """Interrompe o fluxo quando a sensibilidade não pode ser inferida."""
    raise GuardrailError(
        message,
        error_code=ErrorCode.SENSITIVE_DATA_MASKING_ERROR,
    )


def _merge_sensitive_key(
    result: dict[str, str],
    key: str,
    mask_label: str,
) -> None:
    """Adiciona uma chave sensível, bloqueando colisões ambíguas."""
    existing = result.get(key)
    if existing is not None and existing != mask_label:
        _raise_masking_error(
            f"Coluna sensível ambígua no resultado da query: '{key}'."
        )
    result[key] = mask_label


def _table_sensitive_columns(
    table_name: str,
    sensitive_index: dict[tuple[str, str], str],
) -> dict[str, str]:
    """Retorna as colunas sensíveis conhecidas de uma tabela física."""
    return {
        column_name: mask_label
        for (indexed_table, column_name), mask_label in sensitive_index.items()
        if indexed_table == table_name
    }


def _physical_star_requires_schema(
    table_name: str,
    sensitive_index: dict[tuple[str, str], str],
    technical_schema: dict[str, Any] | None,
) -> None:
    """Bloqueia SELECT * físico sem schema quando há coluna sensível."""
    if technical_schema is not None:
        return
    if _table_sensitive_columns(table_name, sensitive_index):
        _raise_masking_error(
            "SELECT * não pode ser expandido com segurança "
            f"pois a tabela '{table_name}' contém colunas sensíveis."
        )


def _resolve_column_sensitive_label(
    column: exp.Column,
    source_outputs: dict[str, dict[str, str]],
) -> str | None:
    """Resolve a sensibilidade de uma coluna no escopo atual."""
    if column.name == "*":
        return None

    table_ref = column.table if column.table else None
    if table_ref:
        return source_outputs.get(table_ref, {}).get(column.name)

    labels = [
        columns[column.name]
        for columns in source_outputs.values()
        if column.name in columns
    ]
    if not labels:
        return None

    unique_labels = set(labels)
    if len(unique_labels) > 1:
        _raise_masking_error(
            f"Coluna sensível sem qualificação é ambígua: '{column.name}'."
        )
    return labels[0]


def _is_aggregation(expression: exp.Expression) -> bool:
    """Verifica se a expressão é uma função de agregação."""
    if isinstance(expression, exp.Alias):
        return _is_aggregation(expression.this)
    return isinstance(
        expression,
        (
            exp.Sum,
            exp.Count,
            exp.Avg,
            exp.Min,
            exp.Max,
            exp.Stddev,
            exp.StddevPop,
            exp.StddevSamp,
            exp.Variance,
            exp.VariancePop,
        ),
    )


def _build_source_outputs(
    scope: Any,
    sensitive_index: dict[tuple[str, str], str],
    technical_schema: dict[str, Any] | None,
    cache: dict[int, dict[str, str]],
    scope_by_expression: dict[int, Any],
) -> dict[str, dict[str, str]]:
    """Mapeia fontes visíveis no escopo para colunas sensíveis expostas."""
    outputs: dict[str, dict[str, str]] = {}

    for source_alias, (_, source) in scope.selected_sources.items():
        if isinstance(source, exp.Table):
            outputs[source_alias] = _table_sensitive_columns(
                source.name, sensitive_index
            )
            continue

        if hasattr(source, "expression"):
            outputs[source_alias] = _extract_sensitive_outputs_from_scope(
                source,
                sensitive_index,
                technical_schema,
                cache,
                scope_by_expression,
            )
            continue

        outputs[source_alias] = {}

    return outputs


def _expand_star_outputs(
    scope: Any,
    table_ref: str | None,
    sensitive_index: dict[tuple[str, str], str],
    technical_schema: dict[str, Any] | None,
    cache: dict[int, dict[str, str]],
    scope_by_expression: dict[int, Any],
) -> dict[str, str]:
    """Expande SELECT * ou alias.* preservando sensibilidade de fontes."""
    result: dict[str, str] = {}

    for source_alias, (_, source) in scope.selected_sources.items():
        if table_ref and source_alias != table_ref:
            continue

        if isinstance(source, exp.Table):
            _physical_star_requires_schema(
                source.name, sensitive_index, technical_schema
            )
            source_outputs = _table_sensitive_columns(source.name, sensitive_index)
        elif hasattr(source, "expression"):
            source_outputs = _extract_sensitive_outputs_from_scope(
                source,
                sensitive_index,
                technical_schema,
                cache,
                scope_by_expression,
            )
        else:
            source_outputs = {}

        for key, mask_label in source_outputs.items():
            _merge_sensitive_key(result, key, mask_label)

    return result


def _current_scope_columns(
    expression: exp.Expression,
    scope: Any,
) -> list[exp.Column]:
    """Retorna colunas da expressão que pertencem ao escopo atual."""
    column_index = getattr(scope, "column_index", {})
    return [
        column
        for column in expression.find_all(exp.Column)
        if id(column) in column_index and column.name != "*"
    ]


def _subquery_sensitive_labels(
    expression: exp.Expression,
    sensitive_index: dict[tuple[str, str], str],
    technical_schema: dict[str, Any] | None,
    cache: dict[int, dict[str, str]],
    scope_by_expression: dict[int, Any],
) -> list[str]:
    """Detecta saídas sensíveis em subqueries escalares da expressão."""
    labels: list[str] = []

    for subquery in expression.find_all(exp.Subquery):
        sub_scope = scope_by_expression.get(id(subquery.this))
        if sub_scope is None:
            continue
        outputs = _extract_sensitive_outputs_from_scope(
            sub_scope,
            sensitive_index,
            technical_schema,
            cache,
            scope_by_expression,
        )
        labels.extend(outputs.values())

    return labels


def _expression_sensitive_labels(
    expression: exp.Expression,
    scope: Any,
    source_outputs: dict[str, dict[str, str]],
    sensitive_index: dict[tuple[str, str], str],
    technical_schema: dict[str, Any] | None,
    cache: dict[int, dict[str, str]],
    scope_by_expression: dict[int, Any],
) -> list[str]:
    """Lista labels sensíveis referenciados por uma expressão."""
    labels: list[str] = []

    for column in _current_scope_columns(expression, scope):
        mask_label = _resolve_column_sensitive_label(column, source_outputs)
        if mask_label:
            labels.append(mask_label)

    labels.extend(
        _subquery_sensitive_labels(
            expression,
            sensitive_index,
            technical_schema,
            cache,
            scope_by_expression,
        )
    )
    return labels


def _sensitive_label_for_alias(
    expression: exp.Expression,
    alias_name: str,
    scope: Any,
    source_outputs: dict[str, dict[str, str]],
    sensitive_index: dict[tuple[str, str], str],
    technical_schema: dict[str, Any] | None,
    cache: dict[int, dict[str, str]],
    scope_by_expression: dict[int, Any],
) -> str | None:
    """Infere a sensibilidade de uma projeção com alias."""
    if isinstance(expression, exp.Column) and expression.name != "*":
        return _resolve_column_sensitive_label(expression, source_outputs)

    labels = _expression_sensitive_labels(
        expression,
        scope,
        source_outputs,
        sensitive_index,
        technical_schema,
        cache,
        scope_by_expression,
    )
    if not labels:
        return None

    if _is_aggregation(expression):
        if isinstance(expression, (exp.Min, exp.Max)):
            _raise_masking_error(
                "Agregação MIN/MAX sobre coluna sensível não é permitida: "
                f"'{alias_name}'."
            )
        return None

    return _derive_mask_label(alias_name)


def _extract_sensitive_outputs_from_scope(
    scope: Any,
    sensitive_index: dict[tuple[str, str], str],
    technical_schema: dict[str, Any] | None,
    cache: dict[int, dict[str, str]],
    scope_by_expression: dict[int, Any],
) -> dict[str, str]:
    """Extrai colunas sensíveis expostas pelo SELECT de um escopo."""
    scope_id = id(scope)
    if scope_id in cache:
        return cache[scope_id]

    cache[scope_id] = {}
    result: dict[str, str] = {}
    source_outputs = _build_source_outputs(
        scope,
        sensitive_index,
        technical_schema,
        cache,
        scope_by_expression,
    )

    for projection in scope.expression.expressions:
        if isinstance(projection, exp.Star):
            for key, mask_label in _expand_star_outputs(
                scope,
                None,
                sensitive_index,
                technical_schema,
                cache,
                scope_by_expression,
            ).items():
                _merge_sensitive_key(result, key, mask_label)
            continue

        if isinstance(projection, exp.Column) and projection.name == "*":
            for key, mask_label in _expand_star_outputs(
                scope,
                projection.table if projection.table else None,
                sensitive_index,
                technical_schema,
                cache,
                scope_by_expression,
            ).items():
                _merge_sensitive_key(result, key, mask_label)
            continue

        if isinstance(projection, exp.Alias):
            mask_label = _sensitive_label_for_alias(
                projection.this,
                projection.alias,
                scope,
                source_outputs,
                sensitive_index,
                technical_schema,
                cache,
                scope_by_expression,
            )
            if mask_label:
                _merge_sensitive_key(result, projection.alias, mask_label)
            continue

        if isinstance(projection, exp.Column):
            mask_label = _resolve_column_sensitive_label(
                projection, source_outputs
            )
            if mask_label:
                _merge_sensitive_key(
                    result, projection.alias_or_name, mask_label
                )
            continue

        labels = _expression_sensitive_labels(
            projection,
            scope,
            source_outputs,
            sensitive_index,
            technical_schema,
            cache,
            scope_by_expression,
        )
        if labels:
            output_name = projection.alias_or_name
            if not output_name:
                _raise_masking_error(
                    "Expressão derivada de coluna sensível precisa de alias "
                    "para ser mascarada com segurança."
                )
            _merge_sensitive_key(
                result, output_name, _derive_mask_label(output_name)
            )

    cache[scope_id] = result
    return result


def _extract_sensitive_keys(
    sql: str,
    sensitive_index: dict[tuple[str, str], str],
    technical_schema: dict[str, Any] | None = None,
) -> dict[str, str]:
    """
    Mapeia chaves do resultado da query para mask_labels.

    Cobre projeções diretas, aliases, expressões derivadas, SELECT *,
    CTEs e subqueries. Propaga sensibilidade de subqueries para o SELECT externo.
    """
    try:
        parsed = parse_one(sql, read="sqlite")
    except Exception:
        return {}

    if not isinstance(parsed, exp.Select):
        return {}
    scopes = list(traverse_scope(parsed))
    root_scope = next(
        (scope for scope in scopes if scope.expression is parsed),
        None,
    )
    if root_scope is None:
        return {}

    scope_by_expression = {id(scope.expression): scope for scope in scopes}
    return _extract_sensitive_outputs_from_scope(
        root_scope,
        sensitive_index,
        technical_schema,
        cache={},
        scope_by_expression=scope_by_expression,
    )


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
    technical_schema: dict[str, Any] | None = None,
) -> MaskingResult:
    """
    Mascara valores sensíveis antes de enviar dados ao LLM.

    Args:
        data: Linhas retornadas pelo banco (dados reais).
        sql: Query SQL validada que gerou os dados.
        descriptions: Metadados de negócio do schema.
        technical_schema: Schema técnico do banco para expandir SELECT *.

    Returns:
        MaskingResult com dados mascarados, mapa de reversão e colunas afetadas.

    Raises:
        GuardrailError: Se houver ambiguidade na identificação de colunas sensíveis
            ou se SELECT * não puder ser expandido com segurança.
    """
    sensitive_index = _build_sensitive_index(descriptions)
    if not sensitive_index or not data:
        return MaskingResult(
            llm_data=[copy.deepcopy(row) for row in data],
            token_to_value={},
            masked_columns=set(),
        )

    sensitive_keys = _extract_sensitive_keys(sql, sensitive_index, technical_schema)
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

    logger.info(
        "sensitive_masking_applied",
        extra={
            "event": "sensitive_masking_applied",
            "masked_columns_count": len(sensitive_keys),
        },
    )

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
