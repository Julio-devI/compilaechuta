from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orders import Pedido
from app.schemas.orders import PedidoCreate


async def get_orders(
    db: AsyncSession,
    status: Optional[str] = None,
    id_produto: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[int, list[Pedido]]:
    query = select(Pedido)

    if status:
        status_str = status.value if hasattr(status, "value") else status
        query = query.where(Pedido.status == status_str)
    if id_produto:
        query = query.where(Pedido.id_produto == id_produto)
    if data_inicio:
        query = query.where(Pedido.id_data >= data_inicio)
    if data_fim:
        query = query.where(Pedido.id_data <= data_fim)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(query.offset(skip).limit(limit))
    data = result.scalars().all()

    return total, data


async def get_all_orders_for_export(db: AsyncSession) -> list[Pedido]:
    result = await db.execute(select(Pedido))
    return result.scalars().all()