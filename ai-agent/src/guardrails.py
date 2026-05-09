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

from src.config import MAX_INPUT_CHARS
from src.exceptions import GuardrailError


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
        raise GuardrailError("Input do usuario esta vazio.")


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
            f"Comprimento recebido: {len(question)}."
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
            "Tentativa de prompt injection detectada no input do usuario."
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
        raise GuardrailError(f"Falha ao parsear SQL: {exc}") from exc
    if not isinstance(parsed, exp.Select):
        raise GuardrailError(
            f"Apenas consultas SELECT são permitidas. "
            f"Tipo detectado: {type(parsed).__name__}"
        )


_MULTIPLE_STATEMENTS_RE = re.compile(r";\s*\S+", re.MULTILINE)


def validate_multiple_statements(sql: str) -> None:
    """
    Detecta múltiplos statements separados por ponto-e-vírgula.

    SQLite já recusa múltiplos statements via cursor.execute(), mas este
    guardrail atua antes da execução para permitir retry controlado.

    Args:
        sql: Query SQL bruto retornado pelo LLM.

    Raises:
        GuardrailError: Se houver `;` seguido de conteúdo não-vazio.
    """
    if _MULTIPLE_STATEMENTS_RE.search(sql):
        raise GuardrailError(
            "Multiplos statements SQL detectados. "
            "Apenas um unico statement SELECT e permitido."
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
                f"Falha ao parsear SQL para allowlist: {exc}"
            ) from exc

    cte_names = {cte.alias for cte in parsed.find_all(exp.CTE)}

    for table in parsed.find_all(exp.Table):
        if table.name in cte_names:
            continue
        if table.name not in allowlist:
            raise GuardrailError(
                f"Tabela '{table.name}' nao esta no allowlist do schema."
            )

    allowed_columns: set[str] = set()
    for cols in allowlist.values():
        allowed_columns.update(cols)

    for col in parsed.find_all(exp.Column):
        if col.name == "*":
            continue
        if col.name not in allowed_columns:
            raise GuardrailError(
                f"Coluna '{col.name}' nao esta no allowlist do schema."
            )


def validate_semantic_schema(
    sql: str,
    allowlist: dict[str, set[str]],
    parsed: exp.Expression | None = None,
) -> None:
    """
    Valida se colunas referenciadas pertencem às tabelas declaradas
    no FROM e JOIN da query, resolvendo aliases corretamente.

    Limitação conhecida (CR-08): o mapeamento de aliases é flat (um
    único dicionário para toda a AST). Se subqueries ou CTEs distintas
    usarem o mesmo alias (ex: ``t``), o último sobrescreve o anterior,
    podendo gerar falsos positivos ou negativos. Queries com aliases
    colidentes são raras em geração por LLM. Será revisado na branch
    ``feat/ai-agent-extras``.

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
                f"Falha ao parsear SQL para validacao semantica: {exc}"
            ) from exc

    # Mapeia alias -> nome real das tabelas no escopo (inclui CTEs)
    scope_tables: dict[str, str] = {}
    for table in parsed.find_all(exp.Table):
        alias = table.alias or table.name
        scope_tables[alias] = table.name

    select_aliases: set[str] = set()
    for node in parsed.find_all(exp.Alias):
        if isinstance(node.parent, (exp.Select, exp.Subquery)):
            select_aliases.add(node.alias)

    for col in parsed.find_all(exp.Column):
        col_name = col.name
        if col_name in select_aliases:
            continue
        table_node = col.args.get("table")
        table_ref = table_node.name if hasattr(table_node, "name") else None

        if table_ref:
            real_table = scope_tables.get(table_ref, table_ref)
            if real_table in allowlist and col_name in allowlist[real_table]:
                continue
            # Fallback para CTEs genuínas: tabela não no allowlist,
            # mas coluna existe em alguma tabela do escopo real
            if real_table not in allowlist:
                found = False
                for scope_tbl in scope_tables.values():
                    if scope_tbl in allowlist and col_name in allowlist[scope_tbl]:
                        found = True
                        break
                if found:
                    continue
            raise GuardrailError(
                f"Coluna '{col_name}' (tabela '{table_ref}') "
                f"nao pertence ao schema."
            )
        else:
            found = False
            for tbl_name in scope_tables.values():
                if tbl_name in allowlist and col_name in allowlist[tbl_name]:
                    found = True
                    break
            if not found:
                raise GuardrailError(
                    f"Coluna '{col_name}' nao pertence a nenhuma "
                    f"tabela do FROM/JOIN."
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
    validate_destructive_queries(sql)
    validate_multiple_statements(sql)

    try:
        parsed = sqlglot.parse_one(sql, read="sqlite")
    except Exception as exc:
        raise GuardrailError(
            f"Falha ao parsear SQL na Camada 2: {exc}"
        ) from exc

    validate_table_column_allowlist(sql, allowlist, parsed=parsed)
    validate_semantic_schema(sql, allowlist, parsed=parsed)
    return add_limit_if_missing(sql, max_rows, parsed=parsed)


def add_limit_if_missing(
    sql: str, max_rows: int, parsed: exp.Expression | None = None
) -> str:
    """
    Adiciona LIMIT max_rows ao final do SQL caso não exista.

    Preserva o ponto-e-vírgula final, se presente.

    Args:
        sql: Query SQL válido.
        max_rows: Número máximo de linhas a serem retornadas.
        parsed: AST pré-parseada do SQL. Se None, parseia internamente.

    Returns:
        SQL com LIMIT injetado no final, quando necessário.

    Raises:
        GuardrailError: Se o SQL não puder ser parseado.
    """
    if parsed is None:
        try:
            parsed = sqlglot.parse_one(sql, read="sqlite")
        except Exception as exc:
            raise GuardrailError(
                f"Falha ao parsear SQL para verificar LIMIT: {exc}"
            ) from exc

    if parsed.args.get("limit"):
        return sql

    stripped = sql.strip()
    if stripped.endswith(";"):
        return stripped[:-1].rstrip() + f" LIMIT {max_rows};"
    return stripped + f" LIMIT {max_rows}"
