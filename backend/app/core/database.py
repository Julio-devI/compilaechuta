# app/core/database.py
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

# Carrega as variáveis do .env
load_dotenv()

# Pega o caminho do banco no .env ou usa um valor padrão se não existir
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./banco_local.db")

# Cria a engine (O motor de conexão com o SQLite)
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL, 
    echo=True, # (Opcional) Deixa True para ver os comandos SQL no terminal
)

# Cria a fábrica de sessões assíncronas 
AsyncSessionLocal = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Base para todos os seus modelos do banco de dados (tabelas)
Base = declarative_base()