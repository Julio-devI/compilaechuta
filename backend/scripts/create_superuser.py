"""
Script para criar um super usuário na tabela gold_operador.
Uso: python scripts/create_superuser.py
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


SUPERUSER = {
    "nome": "Super Admin",
    "username": "superadmin",
    "email": "superadmin@vcommerce.com",
    "telefone": None,
    "role": "super_admin",
    "active": True,
    "senha": "Admin@123",
}


async def create_superuser():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Operador).where(Operador.username == SUPERUSER["username"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"[!] Super usuário '{SUPERUSER['username']}' já existe. Nenhuma ação realizada.")
            return

        superuser = Operador(
            nome=SUPERUSER["nome"],
            username=SUPERUSER["username"],
            email=SUPERUSER["email"],
            telefone=SUPERUSER["telefone"],
            role=SUPERUSER["role"],
            active=SUPERUSER["active"],
            senha_hash=get_password_hash(SUPERUSER["senha"]),
        )

        session.add(superuser)
        await session.commit()
        await session.refresh(superuser)

        print(f"[+] Super usuário criado com sucesso!")
        print(f"    ID:       {superuser.id_operador}")
        print(f"    Nome:     {superuser.nome}")
        print(f"    Username: {superuser.username}")
        print(f"    Email:    {superuser.email}")
        print(f"    Role:     {superuser.role}")
        print(f"    Senha:    {SUPERUSER['senha']}")


if __name__ == "__main__":
    asyncio.run(create_superuser())
