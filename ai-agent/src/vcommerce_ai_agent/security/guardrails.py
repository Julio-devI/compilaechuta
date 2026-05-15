"""
Guardrails de segurança e qualidade para o agente Text-to-SQL.

Este módulo contém validações independentes e testáveis que protegem
o sistema contra queries destrutivas, SQL injection e alucinações de
schema, organizadas em três camadas:

- Camada 1: validação do input do usuário (pré-LLM).
- Camada 2: validação do SQL gerado (pós-LLM).
- Camada 3: validação do resultado da execução (planejada).

Cada função de guardrail lança GuardrailError com mensagem interna
descritiva — nunca exposta ao usuário final.
"""

import re

import sqlglot
import sqlglot.expressions as exp
from sqlglot.optimizer.scope import traverse_scope
from sqlglot.tokens import Tokenizer, TokenType

from vcommerce_ai_agent.core.config import MAX_INPUT_CHARS
from vcommerce_ai_agent.core.exceptions import GuardrailError, ErrorCode
from vcommerce_ai_agent.core.logger import logger


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
        raise GuardrailError("Input do usuario esta vazio.", error_code=ErrorCode.EMPTY_INPUT)


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
            f"Comprimento recebido: {len(question)}.",
            error_code=ErrorCode.INPUT_TOO_LONG
        )


# Padrões de prompt injection detectados na Camada 1
# Inclui variantes em inglês e português brasileiro
_PROMPT_INJECTION_PATTERNS = [
    # Inglês
    r"ignore\s+(previous|all|above)\s+instructions?",
    r"you\s+are\s+now",
    r"disregard\s+your",
    r"forget\s+(everything|all|your)",
    r"act\s+as\s+(if\s+you\s+are|a|an)",
    # Português brasileiro
    r"ignor[ae]r?\s+(todas\s+as\s+)?(instru[cç][õo]es|regras|limites)",
    r"voc[êe]\s+(é|esta|está|eh)\s+agora",
    r"desconsidere\s+(seu|sua|os|as)",
    r"esque[çc]a\s+(tudo|todos|seu|sua|sua\s+programa[cç][ãa]o)",
    r"(aja|atue|comporte-se)\s+como\s+(se\s+voc[êe]\s+fosses?|se\s+fosse|um|uma)",
    r"agora\s+voc[êe]\s+(é|esta|está|eh)",
    # Exfiltração do system prompt — PT-BR
    r"(mostre|mostra|exib[ea]|revele|diga|repita)\s+(me\s+)?(suas?|as|o)\s+(instru[cç][õo]es|regras|prompt|diretriz|configura[cç][ãa]o)",
    r"qual\s+(é|eh|e)\s+o?\s*(seu|teu|sua|tua)\s+(prompt|system\s*prompt|instru[cç][ãa]o)",
    # Exfiltração do system prompt — EN
    r"(show|display|reveal|print|repeat|output)\s+(me\s+)?(your|the)\s+(system\s*)?(prompt|instructions?|rules|directives)",
    r"(what|whats|what's)\s+(is\s+)?(your|the)\s+(system\s*)?(prompt|instructions?)",
]
_PROMPT_INJECTION_RE = re.compile(
    "|".join(f"({p})" for p in _PROMPT_INJECTION_PATTERNS),
    re.IGNORECASE,
)


def validate_prompt_injection(question: str) -> None:
    """
    Detecta tentativas de prompt injection no input do usuário.

    Verifica padrões como instruções para ignorar o system prompt,
    assumir outra persona, ou blocos SQL embutidos diretamente
    na pergunta.

    Args:
        question: Pergunta do usuário em português.

    Raises:
        GuardrailError: Se um padrão de prompt injection for detectado.
    """
    if _PROMPT_INJECTION_RE.search(question):
        raise GuardrailError(
            "Tentativa de prompt injection detectada no input do usuario.",
            error_code=ErrorCode.PROMPT_INJECTION
        )


# ---------------------------------------------------------------------------
# Camada 2 — validação do SQL gerado (etapa 1)
# ---------------------------------------------------------------------------


def validate_destructive_queries(sql: str) -> None:
    """
    Bloqueia queries que não sejam SELECT puro via AST.

    O sqlglot já ignora comentários durante o parse, eliminando a
    necessidade de strip manual. Apenas expressões do tipo Select
    (incluindo CTEs) são permitidas.

    Args:
        sql: Query SQL bruto retornado pelo LLM.

    Raises:
        GuardrailError: Se o SQL não for um SELECT válido.
    """
    try:
        parsed = sqlglot.parse_one(sql, read="sqlite")
    except Exception as exc:
        raise GuardrailError(f"Falha ao parsear SQL: {exc}", error_code=ErrorCode.SQL_PARSE_ERROR) from exc
    if not isinstance(parsed, exp.Select):
        logger.warning(
            "layer_2_blocked",
            extra={"event": "layer_2_blocked", "error_code": ErrorCode.DESTRUCTIVE_QUERY.value},
        )
        raise GuardrailError(
            f"Apenas consultas SELECT são permitidas. "
            f"Tipo detectado: {type(parsed).__name__}",
            error_code=ErrorCode.DESTRUCTIVE_QUERY
        )


def _has_tokens_after_statement_separator(sql: str) -> bool:
    """Detecta tokens reais após ponto-e-vírgula fora de string literal."""
    tokens = Tokenizer(dialect="sqlite").tokenize(sql)
    for index, token in enumerate(tokens):
        if token.token_type == TokenType.SEMICOLON and tokens[index + 1:]:
            return True
    return False


def validate_multiple_statements(sql: str) -> None:
    """
    Detecta múltiplos statements via parser SQL.

    SQLite já recusa múltiplos statements via cursor.execute(), mas este
    guardrail atua antes da execução para permitir retry controlado.
    O uso de AST evita falso positivo com ponto-e-vírgula dentro de
    string literal.

    Args:
        sql: Query SQL bruto retornado pelo LLM.

    Raises:
        GuardrailError: Se houver mais de um statement SQL.
    """
    try:
        expressions = sqlglot.parse(sql, read="sqlite")
    except Exception as exc:
        if _has_tokens_after_statement_separator(sql):
            raise GuardrailError(
                "Multiplos statements SQL detectados. "
                "Apenas um unico statement SELECT e permitido.",
                error_code=ErrorCode.MULTIPLE_STATEMENTS
            ) from exc
        raise GuardrailError(
            f"Falha ao parsear SQL para validar statements: {exc}",
            error_code=ErrorCode.SQL_PARSE_ERROR,
        ) from exc

    statements = [expr for expr in expressions if expr is not None]
    if len(statements) > 1:
        logger.warning(
            "layer_2_blocked",
            extra={"event": "layer_2_blocked", "error_code": ErrorCode.MULTIPLE_STATEMENTS.value},
        )
        raise GuardrailError(
            "Multiplos statements SQL detectados. "
            "Apenas um unico statement SELECT e permitido.",
            error_code=ErrorCode.MULTIPLE_STATEMENTS
        )


# ---------------------------------------------------------------------------
# Camada 2 — validação do SQL gerado (etapa 2)
# ---------------------------------------------------------------------------


def validate_table_column_allowlist(
    sql: str,
    allowlist: dict[str, set[str]],
    parsed: exp.Expression | None = None,
) -> None:
    """
    Valida se todas as tabelas e colunas referenciadas no SQL
    existem no allowlist extraído do schema real do banco.

    CTEs (Common Table Expressions) são identificadas automaticamente
    e ignoradas na checagem de tabelas, pois são temporárias.

    Args:
        sql: Query SQL já validado sintaticamente.
        allowlist: Dicionário mapeando nome da tabela para conjunto
            de nomes de colunas permitidas.
        parsed: AST pré-parseada do SQL. Se None, parseia internamente.

    Raises:
        GuardrailError: Se uma tabela ou coluna fora do allowlist
            for detectada.
    """
    if parsed is None:
        try:
            parsed = sqlglot.parse_one(sql, read="sqlite")
        except Exception as exc:
            raise GuardrailError(
                f"Falha ao parsear SQL para allowlist: {exc}",
                error_code=ErrorCode.SQL_PARSE_ERROR
            ) from exc

    cte_names = {cte.alias for cte in parsed.find_all(exp.CTE)}

    for table in parsed.find_all(exp.Table):
        if table.name in cte_names:
            continue
        if table.name not in allowlist:
            logger.warning(
                "layer_2_blocked",
                extra={"event": "layer_2_blocked", "error_code": ErrorCode.SCHEMA_VIOLATION_ALLOWLIST.value},
            )
            raise GuardrailError(
                f"Tabela '{table.name}' nao esta no allowlist do schema.",
                error_code=ErrorCode.SCHEMA_VIOLATION_ALLOWLIST
            )

    allowed_columns: set[str] = set()
    for cols in allowlist.values():
        allowed_columns.update(cols)

    select_aliases: set[str] = set()
    for node in parsed.find_all(exp.Alias):
        if isinstance(node.parent, (exp.Select, exp.Subquery)):
            select_aliases.add(node.alias)

    for col in parsed.find_all(exp.Column):
        if col.name == "*":
            continue
        if col.name in select_aliases:
            continue
        if col.name not in allowed_columns:
            logger.warning(
                "layer_2_blocked",
                extra={"event": "layer_2_blocked", "error_code": ErrorCode.SCHEMA_VIOLATION_ALLOWLIST.value},
            )
            raise GuardrailError(
                f"Coluna '{col.name}' nao esta no allowlist do schema.",
                error_code=ErrorCode.SCHEMA_VIOLATION_ALLOWLIST
            )


def _semantic_scope_sources(scope: object, allowlist: dict[str, set[str]]) -> dict[str, set[str]]:
    """Mapeia fontes visíveis no escopo atual para suas colunas permitidas."""
    sources: dict[str, set[str]] = {}

    for source_alias, (_, source) in scope.selected_sources.items():
        if isinstance(source, exp.Table):
            if source.name in allowlist:
                sources[source_alias] = allowlist[source.name]
            continue

        if hasattr(source, "expression"):
            sources[source_alias] = _semantic_output_columns(source, allowlist)

    return sources


def _semantic_output_columns(scope: object, allowlist: dict[str, set[str]]) -> set[str]:
    """Infere colunas expostas por CTEs e subqueries a partir do SELECT."""
    output_columns: set[str] = set()

    for projection in getattr(scope.expression, "expressions", []):
        if isinstance(projection, exp.Star):
            for columns in _semantic_scope_sources(scope, allowlist).values():
                output_columns.update(columns)
            continue

        if projection.alias_or_name:
            output_columns.add(projection.alias_or_name)

    return output_columns


def _semantic_select_aliases(scope: object) -> set[str]:
    """Retorna aliases definidos no SELECT do escopo atual."""
    return {
        projection.alias
        for projection in getattr(scope.expression, "expressions", [])
        if isinstance(projection, exp.Alias) and projection.alias
    }


def _semantic_scope_columns(scope: object) -> list[exp.Column]:
    """Retorna apenas colunas pertencentes ao escopo atual."""
    return [
        column
        for column in scope.columns
        if id(column) in scope.column_index
    ]


def _semantic_column_in_sources(
    table_ref: str,
    col_name: str,
    sources: dict[str, set[str]],
) -> bool:
    """Verifica coluna qualificada contra as fontes do escopo atual."""
    return table_ref in sources and col_name in sources[table_ref]


def _semantic_unqualified_column_in_sources(
    col_name: str,
    sources: dict[str, set[str]],
) -> bool:
    """Verifica coluna sem prefixo contra qualquer fonte do escopo atual."""
    return any(col_name in columns for columns in sources.values())


def _semantic_column_in_parent_scope(
    table_ref: str,
    col_name: str,
    scope: object,
    allowlist: dict[str, set[str]],
) -> bool:
    """Resolve referências correlacionadas contra escopos ancestrais."""
    parent = scope.parent

    while parent is not None:
        parent_sources = _semantic_scope_sources(parent, allowlist)
        if _semantic_column_in_sources(table_ref, col_name, parent_sources):
            return True
        parent = parent.parent

    return False


def validate_semantic_schema(
    sql: str,
    allowlist: dict[str, set[str]],
    parsed: exp.Expression | None = None,
) -> None:
    """
    Valida se colunas referenciadas pertencem às tabelas declaradas
    no FROM e JOIN da query, resolvendo aliases corretamente.

    A validação percorre os escopos da AST separadamente para evitar
    colisões quando subqueries ou CTEs reutilizam o mesmo alias.

    Args:
        sql: Query SQL já validado sintaticamente.
        allowlist: Dicionário mapeando nome da tabela para conjunto
            de nomes de colunas permitidas.
        parsed: AST pré-parseada do SQL. Se None, parseia internamente.

    Raises:
        GuardrailError: Se uma coluna não puder ser associada a uma
            tabela do escopo ou se o SQL não puder ser parseado.
    """
    if parsed is None:
        try:
            parsed = sqlglot.parse_one(sql, read="sqlite")
        except Exception as exc:
            raise GuardrailError(
                f"Falha ao parsear SQL para validacao semantica: {exc}",
                error_code=ErrorCode.SQL_PARSE_ERROR
            ) from exc

    for scope in traverse_scope(parsed):
        scope_sources = _semantic_scope_sources(scope, allowlist)
        select_aliases = _semantic_select_aliases(scope)

        for col in _semantic_scope_columns(scope):
            col_name = col.name
            if col_name in select_aliases:
                continue

            table_node = col.args.get("table")
            table_ref = table_node.name if hasattr(table_node, "name") else None

            if table_ref:
                if _semantic_column_in_sources(table_ref, col_name, scope_sources):
                    continue
                if _semantic_column_in_parent_scope(table_ref, col_name, scope, allowlist):
                    continue
                logger.warning(
                    "layer_2_blocked",
                    extra={"event": "layer_2_blocked", "error_code": ErrorCode.SCHEMA_VIOLATION_SEMANTIC.value},
                )
                raise GuardrailError(
                    f"Coluna '{col_name}' (tabela '{table_ref}') "
                    f"nao pertence ao schema.",
                    error_code=ErrorCode.SCHEMA_VIOLATION_SEMANTIC
                )

            if not _semantic_unqualified_column_in_sources(col_name, scope_sources):
                logger.warning(
                    "layer_2_blocked",
                    extra={"event": "layer_2_blocked", "error_code": ErrorCode.SCHEMA_VIOLATION_SEMANTIC.value},
                )
                raise GuardrailError(
                    f"Coluna '{col_name}' nao pertence a nenhuma "
                    f"tabela do FROM/JOIN.",
                    error_code=ErrorCode.SCHEMA_VIOLATION_SEMANTIC
                )


def apply_layer_2(
    sql: str,
    allowlist: dict[str, set[str]],
    max_rows: int,
) -> str:
    """
    Aplica todos os guardrails da Camada 2 na ordem correta.

    Ordem:
        1. validate_destructive_queries (AST — ignora comentários)
        2. validate_multiple_statements
        3. validate_table_column_allowlist
        4. validate_semantic_schema
        5. add_limit_if_missing

    O SQL é parseado uma única vez por `apply_layer_2` e a AST resultante
    é reaproveitada nas validações seguintes para evitar parses redundantes.

    Args:
        sql: Query SQL bruta retornada pelo LLM.
        allowlist: Dicionário de tabelas e colunas permitidas.
        max_rows: Limite de linhas a ser injetado se ausente.

    Returns:
        SQL validado e com LIMIT aplicado.

    Raises:
        GuardrailError: Se qualquer guardrail da Camada 2 falhar.
    """
    validate_multiple_statements(sql)
    validate_destructive_queries(sql)

    try:
        parsed = sqlglot.parse_one(sql, read="sqlite")
    except Exception as exc:
        logger.warning(
            "layer_2_blocked",
            extra={"event": "layer_2_blocked", "error_code": ErrorCode.SQL_PARSE_ERROR.value},
        )
        raise GuardrailError(
            f"Falha ao parsear SQL na Camada 2: {exc}",
            error_code=ErrorCode.SQL_PARSE_ERROR
        ) from exc

    validate_table_column_allowlist(sql, allowlist, parsed=parsed)
    validate_semantic_schema(sql, allowlist, parsed=parsed)
    return add_limit_if_missing(sql, max_rows, parsed=parsed)


def add_limit_if_missing(
    sql: str, max_rows: int, parsed: exp.Expression | None = None
) -> str:
    """
    Garante LIMIT máximo no statement principal.

    Preserva o ponto-e-vírgula final, se presente.

    Args:
        sql: Query SQL válido.
        max_rows: Número máximo de linhas permitido pela aplicação.
        parsed: AST pré-parseada do SQL. Se None, parseia internamente.

    Returns:
        SQL com LIMIT injetado ou reduzido para respeitar `max_rows`.

    Raises:
        GuardrailError: Se o SQL não puder ser parseado.
    """
    if parsed is None:
        try:
            parsed = sqlglot.parse_one(sql, read="sqlite")
        except Exception as exc:
            logger.warning(
                "layer_2_blocked",
                extra={"event": "layer_2_blocked", "error_code": ErrorCode.SQL_PARSE_ERROR.value},
            )
            raise GuardrailError(
                f"Falha ao parsear SQL para verificar LIMIT: {exc}",
                error_code=ErrorCode.SQL_PARSE_ERROR
            ) from exc

    trailing_semicolon = sql.strip().endswith(";")
    limit = parsed.args.get("limit")
    if limit:
        expression = limit.args.get("expression")
        llm_limit: int | None = None
        if isinstance(expression, exp.Literal) and not expression.is_string:
            try:
                llm_limit = int(str(expression.this))
            except ValueError:
                llm_limit = None

        if llm_limit is not None and 0 <= llm_limit <= max_rows:
            return sql

        parsed.set(
            "limit",
            exp.Limit(expression=exp.Literal.number(max_rows)),
        )
        limited_sql = parsed.sql(dialect="sqlite")
        return limited_sql + ";" if trailing_semicolon else limited_sql

    stripped = sql.strip()
    if trailing_semicolon:
        return stripped[:-1].rstrip() + f" LIMIT {max_rows};"
    return stripped + f" LIMIT {max_rows}"
