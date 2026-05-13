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
    status_ticket: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
) -> tuple[int, list[Pedido]]:
    # 1. Base da query
    query = select(Pedido)

    # 2. Aplicar Joins APENAS se os filtros existirem (Economiza processamento)
    if tipo_cliente:
        tipo_str = tipo_cliente.value if hasattr(
            tipo_cliente, "value") else tipo_cliente
        query = query.join(Pedido.cliente).where(
            Cliente.segmento_rfm == tipo_str)

    if status_ticket:
        status_str = status_ticket.value if hasattr(
            status_ticket, "value") else status_ticket
        query = query.join(Pedido.tickets).where(Ticket.status == status_str)

    # 3. Filtros diretos
    if status:
        status_str = status.value if hasattr(status, "value") else status
        query = query.where(Pedido.status == status_str)
    if id_produto:
        query = query.where(Pedido.id_pedido_display == id_produto)
    if data_inicio:
        query = query.where(Pedido.id_data >= data_inicio)
    if data_fim:
        query = query.where(Pedido.id_data <= data_fim)

    count_stmt = query.with_only_columns(
        func.count(func.distinct(Pedido.id_pedido))
    ).order_by(None)

    total = (await db.execute(count_stmt)).scalar_one()

    query = query.distinct()

    query = query.options(
        selectinload(Pedido.tickets)
    )

    # 7. Execução com Paginação
    result = await db.execute(query.offset(skip).limit(limit))
    data = result.scalars().all()

    return total, data


async def get_all_orders_for_export(db: AsyncSession) -> list[Pedido]:
    result = await db.execute(select(Pedido))
    return result.scalars().all()