"""
Testes unitários para a camada de acesso ao banco SQLite.
"""

import sqlite3
import time

import pytest

from vcommerce_ai_agent.database.db import Database


def _create_numbers_db(db_path: str, rows_count: int = 300) -> None:
    """Cria um banco temporário com dados suficientes para consulta pesada."""
    with sqlite3.connect(db_path) as conn:
        conn.execute("CREATE TABLE numbers(value INTEGER)")
        conn.executemany(
            "INSERT INTO numbers(value) VALUES (?)",
            [(index,) for index in range(rows_count)],
        )


async def test_execute_query_interrupts_sqlite_on_timeout(tmp_path):
    db_path = str(tmp_path / "timeout.db")
    _create_numbers_db(db_path)
    database = Database(db_path, query_timeout_seconds=0.05)
    sql = """
        SELECT SUM((a.value + b.value + c.value) % 97) AS total
        FROM numbers a, numbers b, numbers c
    """

    start = time.perf_counter()
    with pytest.raises(TimeoutError) as exc_info:
        await database.execute_query(sql)

    elapsed = time.perf_counter() - start
    assert "A consulta excedeu o limite" in str(exc_info.value)
    assert elapsed < 1.0
