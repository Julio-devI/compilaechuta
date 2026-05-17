"""
Script para criar um usuário admin na tabela gold_operador.
Uso: python scripts/create_admin.py
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


ADMIN = {
    "nome": "Admin",
    "username": "admin",
    "email": "admin@vcommerce.com",
    "telefone": None,
    "role": "admin",
    "active": True,
    "senha": "Admin@123",
}


async def create_admin():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Operador).where(Operador.username == ADMIN["username"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"[!] Admin '{ADMIN['username']}' já existe. Nenhuma ação realizada.")
            return

        admin = Operador(
            nome=ADMIN["nome"],
            username=ADMIN["username"],
            email=ADMIN["email"],
            telefone=ADMIN["telefone"],
            role=ADMIN["role"],
            active=ADMIN["active"],
            senha_hash=get_password_hash(ADMIN["senha"]),
        )

        session.add(admin)
        await session.commit()
        await session.refresh(admin)

        print(f"[+] Admin criado com sucesso!")
        print(f"    ID:       {admin.id_operador}")
        print(f"    Nome:     {admin.nome}")
        print(f"    Username: {admin.username}")
        print(f"    Email:    {admin.email}")
        print(f"    Role:     {admin.role}")
        print(f"    Senha:    {ADMIN['senha']}")


if __name__ == "__main__":
    asyncio.run(create_admin())
