from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.orders import Pedido
from app.models.tickets import Ticket
from app.models.clients import Cliente
from app.models.products import Produto
from app.schemas.orders import PedidoCreate


async def get_orders(
    db: AsyncSession,
    status: Optional[str] = None,
    id_produto: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    tipo_cliente: Optional[str] = None,
    sku_produto: Optional[str] = None,
    status_ticket: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[int, list[Pedido]]:
    query = select(Pedido)

    if status:
        status_str = status.value if hasattr(status, "value") else status
        query = query.where(Pedido.status == status_str)

    if id_produto:
        query = query.where(Pedido.id_pedido_display == id_produto)

    if data_inicio:
        query = query.where(Pedido.id_data >= data_inicio)

    if data_fim:
        query = query.where(Pedido.id_data <= data_fim)

    if tipo_cliente:
        tipo_str = tipo_cliente.value if hasattr(
            tipo_cliente, "value") else tipo_cliente
        query = query.join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
        query = query.where(Cliente.segmento_rfm == tipo_str)

    if status_ticket:
        status_str = status_ticket.value if hasattr(status_ticket, "value") else status_ticket
        query = query.join(Ticket, Pedido.id_pedido == Ticket.id_pedido)
        query = query.where(Ticket.status == status_str)

    if sku_produto:
        query = query.join(Produto, Pedido.id_produto == Produto.id_produto)
        query = query.where(Produto.sku.ilike(f"%{sku_produto}%"))

    # Crucial: usar distinct para não duplicar Pedidos que tenham múltiplos matches (especialmente em Tickets)
    query = query.distinct()

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(query.offset(skip).limit(limit))
    data = result.scalars().all()

    return total, data


async def get_all_orders_for_export(db: AsyncSession) -> list[Pedido]:
    result = await db.execute(select(Pedido))
    return result.scalars().all()