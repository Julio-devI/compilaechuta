import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

# for now, just a example
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Conection engine with SQLite
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL, 
    echo=True, # (Opcional) Deixa True para ver os comandos SQL no terminal
)

AsyncSessionLocal = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# For data base Models
Base = declarative_base()