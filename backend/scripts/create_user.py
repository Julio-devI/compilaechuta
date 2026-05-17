"""
Script para criar um usuário comum (role=user) na tabela gold_operador.
Uso: python scripts/create_user.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.operator import Operador
import app.models  # noqa: garante que todos os modelos sejam registrados


USER = {
    "nome": "User",
    "username": "user",
    "email": "user@vcommerce.com",
    "telefone": None,
    "role": "user",
    "active": True,
    "senha": "Admin@123",
}


async def create_user():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Operador).where(Operador.username == USER["username"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"[!] Usuário '{USER['username']}' já existe. Nenhuma ação realizada.")
            return

        user = Operador(
            nome=USER["nome"],
            username=USER["username"],
            email=USER["email"],
            telefone=USER["telefone"],
            role=USER["role"],
            active=USER["active"],
            senha_hash=get_password_hash(USER["senha"]),
        )

        session.add(user)
        await session.commit()
        await session.refresh(user)

        print(f"[+] Usuário criado com sucesso!")
        print(f"    ID:       {user.id_operador}")
        print(f"    Nome:     {user.nome}")
        print(f"    Username: {user.username}")
        print(f"    Email:    {user.email}")
        print(f"    Role:     {user.role}")
        print(f"    Senha:    {USER['senha']}")


if __name__ == "__main__":
    asyncio.run(create_user())
