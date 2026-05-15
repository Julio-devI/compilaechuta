from typing import List, Optional
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.operator import Operador
from app.schemas.operator import OperatorCreate, OperatorUpdate
from app.core.security import get_password_hash


async def get_operator(db: AsyncSession, id_operador: str) -> Optional[Operador]:
    result = await db.execute(select(Operador).where(Operador.id_operador == id_operador))
    return result.scalar_one_or_none()


async def get_operator_by_email_or_username(db: AsyncSession, identifier: str) -> Optional[Operador]:
    result = await db.execute(
        select(Operador).where(
            or_(Operador.email == identifier, Operador.username == identifier)
        )
    )
    return result.scalar_one_or_none()


async def get_operator_by_email(db: AsyncSession, email: str) -> Optional[Operador]:
    result = await db.execute(select(Operador).where(Operador.email == email))
    return result.scalar_one_or_none()


async def update_operator_password(db: AsyncSession, operador: Operador, new_password_hash: str) -> Operador:
    operador.senha_hash = new_password_hash
    db.add(operador)
    await db.commit()
    await db.refresh(operador)
    return operador


async def get_multi_operators(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role: Optional[str] = None,
    active: Optional[bool] = None,
    caller_role: Optional[str] = None,
) -> tuple[int, List[Operador]]:
    query = select(Operador)

    if caller_role != "super_admin":
        query = query.where(Operador.role != "super_admin")

    if search:
        query = query.where(
            Operador.nome.ilike(f"%{search}%") | Operador.username.ilike(f"%{search}%")
        )
    if role:
        query = query.where(Operador.role == role)
    if active is not None:
        query = query.where(Operador.active == active)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(query.offset(skip).limit(limit))
    return total, list(result.scalars().all())


async def create_operator(db: AsyncSession, *, obj_in: OperatorCreate) -> Operador:
    data = obj_in.model_dump(exclude={"password"})
    db_obj = Operador(**data, senha_hash=get_password_hash(obj_in.password))
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


async def update_operator(
    db: AsyncSession, *, db_obj: Operador, obj_in: OperatorUpdate
) -> Operador:
    update_data = obj_in.model_dump(exclude_unset=True, exclude={"password"})
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    if obj_in.password:
        db_obj.senha_hash = get_password_hash(obj_in.password)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


async def remove_operator(db: AsyncSession, *, id_operador: str) -> Optional[Operador]:
    result = await db.execute(select(Operador).where(Operador.id_operador == id_operador))
    obj = result.scalar_one_or_none()
    if obj:
        await db.delete(obj)
        await db.commit()
    return obj
