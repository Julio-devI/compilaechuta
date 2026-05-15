"""
Script diagnóstico que emula uma chamada simples do backend ao ai-agent.

Executa a pipeline completa:
pergunta -> Chamada 1 (SQL) -> banco -> Chamada 2 (insight) -> payload JSON.
"""

import argparse
import asyncio
import json
import sys
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "src"))

DEFAULT_QUESTION = (
    "Quais são as 5 categorias de produto com maior receita total em pedidos "
    "entregues? Mostre a receita total e a quantidade vendida por categoria, "
    "ordenando por receita decrescente."
)


def _to_jsonable(value: Any) -> Any:
    """Converte dataclasses e containers para estruturas JSON-serializáveis."""
    if is_dataclass(value):
        return _to_jsonable(asdict(value))
    if isinstance(value, dict):
        return {key: _to_jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_to_jsonable(item) for item in value]
    return value


async def _run(
    question: str,
    db_path: str,
    max_rows: int,
    max_tokens_sql: int,
) -> dict[str, Any]:
    from vcommerce_ai_agent.core import config

    config.MAX_TOKENS_SQL = max_tokens_sql

    from vcommerce_ai_agent.agent import VCommerceAgent

    agent = VCommerceAgent(
        db_path=db_path,
        max_rows=max_rows,
    )
    response = await agent.ask(question)

    return {
        "backend_request": {
            "question": question,
            "db_path": db_path,
            "max_rows": max_rows,
            "max_tokens_sql": max_tokens_sql,
        },
        "call_1_sql_generation": {
            "sql": response.developer_debug.sql,
            "out_of_scope": response.status == "out_of_scope",
        },
        "call_2_backend_response": _to_jsonable(response),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Emula o backend chamando a pipeline completa do ai-agent."
    )
    parser.add_argument(
        "--db-path",
        default=str(PROJECT_ROOT / "test_suggestions.db"),
        help="Caminho para o SQLite usado pelo agente.",
    )
    parser.add_argument(
        "--question",
        default=DEFAULT_QUESTION,
        help="Pergunta em português enviada ao agente.",
    )
    parser.add_argument(
        "--max-rows",
        type=int,
        default=1000,
        help="Limite máximo de linhas retornadas pela execução SQL.",
    )
    parser.add_argument(
        "--max-tokens-sql",
        type=int,
        default=4096,
        help="Limite de tokens da Chamada 1 nesta execução diagnóstica.",
    )
    args = parser.parse_args()

    payload = asyncio.run(
        _run(args.question, args.db_path, args.max_rows, args.max_tokens_sql)
    )
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
