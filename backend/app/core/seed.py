from __future__ import annotations

import asyncio
import logging
import sqlite3
from contextlib import closing
from pathlib import Path

import pandas as pd
from alembic import command
from alembic.config import Config

from app.core.config import BACKEND_ROOT, settings


logger = logging.getLogger(__name__)

CSV_TABLES = (
    "dim_cliente",
    "gold_categoria",
    "dim_produto",
    "dim_tempo",
    "fato_vendas",
    "fato_avaliacoes_pedido",
    "fato_clickstream_navegacao",
    "fato_suporte_ticket",
    "gold_satisfacao_agente",
    "gold_satisfacao_problema",
)
INGESTION_COLUMN = "timestamp_ingestion_gold"
SQLITE_PREFIX = "sqlite+aiosqlite:///"
SEED_CHUNKSIZE = 10_000


def resolve_csv_dir(csv_dir: str | None = None) -> Path:
    """Resolve a pasta de CSVs a partir do cwd ou da raiz do backend."""
    configured_path = Path(csv_dir or settings.CSV_DIR)
    candidates = []

    if configured_path.is_absolute():
        candidates.append(configured_path)
    else:
        candidates.append(Path.cwd() / configured_path)
        candidates.append(BACKEND_ROOT / configured_path)

    for candidate in candidates:
        if candidate.is_dir():
            return candidate.resolve()

    searched_paths = ", ".join(str(candidate) for candidate in candidates)
    raise FileNotFoundError(
        f"Pasta de seed CSV não encontrada. Caminhos avaliados: {searched_paths}"
    )


def resolve_sqlite_path(database_url: str | None = None) -> Path:
    """Resolve o caminho do arquivo SQLite usado pelo backend."""
    url = database_url or settings.SQLALCHEMY_DATABASE_URL
    if not url.startswith(SQLITE_PREFIX):
        raise ValueError("Seed automático suporta apenas DATABASE_URL SQLite.")

    raw_path = url[len(SQLITE_PREFIX) :]
    path = Path(raw_path)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path.resolve()


def _missing_seed_files(csv_dir: Path) -> list[Path]:
    return [
        csv_dir / f"{table_name}.csv"
        for table_name in CSV_TABLES
        if not (csv_dir / f"{table_name}.csv").exists()
    ]


def _load_csv_table(conn: sqlite3.Connection, csv_dir: Path, table_name: str) -> None:
    csv_path = csv_dir / f"{table_name}.csv"
    dataframe = pd.read_csv(csv_path)
    dataframe = dataframe.drop(columns=[INGESTION_COLUMN], errors="ignore")
    dataframe.to_sql(
        table_name,
        conn,
        if_exists="replace",
        index=False,
        chunksize=SEED_CHUNKSIZE,
    )


def _run_migrations(database_url: str) -> None:
    alembic_config = Config(str(BACKEND_ROOT / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    alembic_config.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(alembic_config, "head")


def seed_database_if_needed_sync(
    database_url: str | None = None,
    csv_dir: str | None = None,
) -> bool:
    """Cria o SQLite quando o arquivo não existe e popula se houver CSVs."""
    sqlite_path = resolve_sqlite_path(database_url)

    if sqlite_path.exists():
        logger.info(
            "Banco SQLite já existe. Seed CSV automático ignorado.",
            extra={"db_path": str(sqlite_path)},
        )
        return False

    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    normalized_database_url = f"{SQLITE_PREFIX}{sqlite_path.as_posix()}"
    _run_migrations(normalized_database_url)

    try:
        resolved_csv_dir = resolve_csv_dir(csv_dir)
    except FileNotFoundError as exc:
        logger.warning(
            "Banco SQLite criado, mas seed CSV ignorado porque a pasta de dados não foi encontrada.",
            extra={"db_path": str(sqlite_path), "error": str(exc)},
        )
        return True

    missing_files = _missing_seed_files(resolved_csv_dir)
    if missing_files:
        logger.warning(
            "Banco SQLite criado, mas seed CSV ignorado porque há arquivos ausentes.",
            extra={
                "db_path": str(sqlite_path),
                "csv_dir": str(resolved_csv_dir),
                "missing_files": [str(path) for path in missing_files],
            },
        )
        return True

    with closing(sqlite3.connect(sqlite_path)) as conn:
        conn.execute("PRAGMA foreign_keys=OFF")

        logger.info(
            "Criando banco SQLite a partir dos CSVs.",
            extra={"db_path": str(sqlite_path), "csv_dir": str(resolved_csv_dir)},
        )

        for table_name in CSV_TABLES:
            _load_csv_table(conn, resolved_csv_dir, table_name)
            logger.info("Tabela populada via seed CSV.", extra={"table": table_name})

        conn.commit()
        logger.info("Seed CSV concluído.")
        return True


async def seed_database_if_needed() -> bool:
    """Executa o seed fora do event loop principal do FastAPI."""
    if not settings.AUTO_SEED_DATABASE:
        logger.info("Seed CSV automático desativado por configuração.")
        return False

    return await asyncio.to_thread(seed_database_if_needed_sync)
