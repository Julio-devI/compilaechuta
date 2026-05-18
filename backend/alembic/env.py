import asyncio
import logging
import os
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from dotenv import load_dotenv
from alembic import context


from app.core.config import settings
from app.core.database import Base
from app.models.ai_agent import AIAgentSession  # noqa: F401
from app.models.clients import Cliente   # noqa: F401
from app.models.tickets import Ticket    # noqa: F401
from app.models.products import Produto  # noqa: F401
from app.models.category import Categoria  # noqa: F401
from app.models.orders import Pedido  # noqa: F401
from app.models.operator import Operador  # noqa: F401


# Carrega as variáveis do .env
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))


config = context.config


if not config.get_main_option("sqlalchemy.url"):
    config.set_main_option("sqlalchemy.url", settings.SQLALCHEMY_DATABASE_URL)


if config.config_file_name is not None and not logging.getLogger().handlers:
    fileConfig(config.config_file_name, disable_existing_loggers=False)


target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Modo Offline."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )


    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection):
    context.configure(
        connection=connection, 
        target_metadata=target_metadata,
        render_as_batch=True, 
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Cria a engine assíncrona e chama a do_run_migrations."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )


    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)


    await connectable.dispose()


def run_migrations_online() -> None:
    """Modo Online."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
