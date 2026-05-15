"""
Camada de acesso ao banco de dados.

O módulo `db.py` é responsável exclusivamente por conectar-se ao banco
SQLite já existente (gerenciado pelo backend) e executar queries de leitura.
Não cria tabelas, não popula dados e não gerencia migrações.
"""

import asyncio
import sqlite3
from typing import Any

import aiosqlite


class Database:
    """Conexão assíncrona com o banco SQLite para execução de queries de leitura."""

    def __init__(
        self,
        db_path: str | None,
        max_rows: int = 1000,
        query_timeout_seconds: int = 10,
    ) -> None:
        """
        Inicializa a conexão com o caminho do banco.

        Args:
            db_path: Caminho absoluto ou relativo para o arquivo `.db`.
                     Se vazio ou None, a conexão será tratada como não configurada
                     e uma mensagem amigável será retornada na primeira tentativa
                     de uso, sem interromper a aplicação.
            max_rows: Número máximo de linhas retornadas por query.
            query_timeout_seconds: Timeout em segundos para execução de queries.
        """
        self._db_path = db_path.strip() if db_path else None
        self._max_rows = max_rows
        self._query_timeout_seconds = query_timeout_seconds

    def _get_connection_uri(self) -> str:
        """Monta a URI de conexão com read-only para arquivos em disco."""
        if not self._db_path:
            raise RuntimeError(
                "Caminho do banco de dados não configurado. "
                "Verifique a variável de ambiente DB_PATH."
            )
        if self._db_path == ":memory:":
            return ":memory:"
        return f"file:{self._db_path}?mode=ro"

    async def execute_query(self, sql: str) -> tuple[list[dict[str, Any]], bool]:
        """
        Executa uma query SELECT no banco e retorna os resultados.

        Args:
            sql: Query SQL válida (apenas SELECT).

        Returns:
            Tupla contendo:
                - Lista de dicionários representando as linhas retornadas.
                - Booleano indicando se o resultado foi truncado por exceder MAX_ROWS.

        Raises:
            RuntimeError: Em caso de falha de conexão ou execução SQL.
            TimeoutError: Se a execução exceder QUERY_TIMEOUT_SECONDS.
        """

        conn: aiosqlite.Connection | None = None

        try:
            conn = await aiosqlite.connect(self._get_connection_uri(), uri=True)
            conn.row_factory = aiosqlite.Row

            async def _run() -> tuple[list[dict[str, Any]], bool]:
                cursor = await conn.execute(sql)
                rows = await cursor.fetchmany(self._max_rows + 1)
                await cursor.close()
                truncated = len(rows) > self._max_rows
                if truncated:
                    rows = rows[: self._max_rows]
                result = [dict(row) for row in rows]
                return result, truncated

            return await asyncio.wait_for(
                _run(), timeout=self._query_timeout_seconds
            )
        except asyncio.TimeoutError as exc:
            if conn is not None:
                await conn.interrupt()
            raise TimeoutError(
                f"A consulta excedeu o limite de {self._query_timeout_seconds} segundos. "
                "Tente simplificar a pergunta ou adicionar filtros mais específicos."
            ) from exc
        except sqlite3.OperationalError as exc:
            raise RuntimeError(
                f"Erro ao executar a consulta no banco: {exc}"
            ) from exc
        except sqlite3.Error as exc:
            raise RuntimeError(
                f"Erro de banco de dados: {exc}"
            ) from exc
        finally:
            if conn is not None:
                await conn.close()

    async def get_technical_schema(self) -> dict[str, Any]:
        """
        Extrai o schema técnico completo do banco de dados.

        Returns:
            Dicionário com estrutura:
            {
                "tables": {
                    "nome_tabela": {
                        "columns": [
                            {"name": "...", "type": "...", "notnull": 0|1, "dflt_value": ..., "pk": 0|1}
                        ],
                        "primary_keys": ["..."],
                        "foreign_keys": [
                            {"id": 0, "seq": 0, "table": "...", "from": "...", "to": "...", "on_update": "...", "on_delete": "..."}
                        ]
                    }
                }
            }

        Raises:
            RuntimeError: Se o banco não for encontrado ou houver falha de leitura.
        """
        schema: dict[str, Any] = {"tables": {}}

        try:
            async with aiosqlite.connect(self._get_connection_uri(), uri=True) as conn:
                # Lista todas as tabelas do schema principal (exceto sqlite_)
                async with conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                ) as cursor:
                    tables = [row[0] for row in await cursor.fetchall()]

                for table_name in tables:
                    table_info: dict[str, Any] = {
                        "columns": [],
                        "primary_keys": [],
                        "foreign_keys": [],
                    }

                    # Escapa aspas duplas no nome da tabela para uso nos PRAGMAs
                    escaped_name = table_name.replace('"', '""')

                    async with conn.execute(f'PRAGMA table_info("{escaped_name}")') as cursor:
                        async for row in cursor:
                            col = {
                                "name": row[1],
                                "type": row[2],
                                "notnull": row[3],
                                "dflt_value": row[4],
                                "pk": row[5],
                            }
                            table_info["columns"].append(col)
                            if row[5]:
                                table_info["primary_keys"].append(row[1])

                    async with conn.execute(
                        f'PRAGMA foreign_key_list("{escaped_name}")'
                    ) as cursor:
                        async for row in cursor:
                            table_info["foreign_keys"].append(
                                {
                                    "id": row[0],
                                    "seq": row[1],
                                    "table": row[2],
                                    "from": row[3],
                                    "to": row[4],
                                    "on_update": row[5],
                                    "on_delete": row[6],
                                }
                            )

                    schema["tables"][table_name] = table_info

                return schema

        except sqlite3.OperationalError as exc:
            raise RuntimeError(
                f"Erro ao carregar o schema do banco: {exc}"
            ) from exc
        except sqlite3.Error as exc:
            raise RuntimeError(
                f"Falha de conexão ou leitura do banco: {exc}"
            ) from exc
