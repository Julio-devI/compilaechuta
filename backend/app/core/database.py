from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import event
from dotenv import load_dotenv
from app.core.config import settings


load_dotenv()


SQLALCHEMY_DATABASE_URL = settings.SQLALCHEMY_DATABASE_URL


engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=True,
)


@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if SQLALCHEMY_DATABASE_URL and "sqlite" in SQLALCHEMY_DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


Base = declarative_base()
