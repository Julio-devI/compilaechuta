from typing import Optional
from datetime import date

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, contains_eager

from app.models.orders import Pedido
from app.models.tickets import Ticket
from app.models.clients import Cliente
from app.models.products import Produto
from app.schemas.orders import PedidoCreate


class OrderFilters:
    def __init__(
        self,
        status: Optional[str] = None,
        id_pedido_display: Optional[str] = None,
        data_inicio: Optional[date] = None,
        data_fim: Optional[date] = None,
        status_ticket: Optional[str] = None,
        nome_produto: Optional[str] = None,
    ):
        self.status = status
        self.id_pedido_display = id_pedido_display
        self.data_inicio = data_inicio
        self.data_fim = data_fim
        self.status_ticket = status_ticket
        self.nome_produto = nome_produto


def filters_query(query, filters: OrderFilters):
    query = select(Pedido)
    need_distinct = False


    if filters.status:
        status_str = filters.status.value if hasattr(filters.status, "value") else filters.status
        query = query.where(Pedido.status == status_str)

    if filters.id_pedido_display:
        query = query.where(
            Pedido.id_pedido_display.ilike(f"%{filters.id_pedido_display}%"))

    if filters.data_inicio:
        query = query.where(Pedido.id_data >= filters.data_inicio)

    if filters.data_fim:
        query = query.where(Pedido.id_data <= filters.data_fim)

    if filters.status_ticket:
        status_str = filters.status_ticket.value if hasattr(
            filters.status_ticket, "value") else filters.status_ticket
        query = query.join(Pedido.tickets).where(Ticket.status == status_str)
        need_distinct = True

    if filters.nome_produto:
        subquery = (
            select(Produto.id_produto)
            .where(Produto.nome_produto.ilike(f"{filters.nome_produto}%"))
        )

        query = query.where(Pedido.id_produto.in_(subquery))

    return query, need_distinct


async def get_orders(
    db: AsyncSession,
    filters: OrderFilters,
    tipo_cliente: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[int, list[Pedido]]:
    
    query = select(Pedido)

    # Base filtering
    if filters.status:
        status_str = filters.status.value if hasattr(
            filters.status, "value") else filters.status
        query = query.where(Pedido.status == status_str)

    if filters.id_pedido_display:
        query = query.where(Pedido.id_pedido_display.ilike(
            f"%{filters.id_pedido_display}%"))

    if filters.data_inicio:
        query = query.where(Pedido.id_data >= filters.data_inicio)

    if filters.data_fim:
        query = query.where(Pedido.id_data <= filters.data_fim)

    if tipo_cliente:
        tipo_str = tipo_cliente.value if hasattr(
            tipo_cliente, "value") else tipo_cliente
        query = query.join(Pedido.cliente).where(
            Cliente.segmento_rfm == tipo_str)

    if filters.nome_produto:
        subquery = (
            select(Produto.id_produto)
            .where(Produto.nome_produto.ilike(f"{filters.nome_produto}%"))
        )

        query = query.where(Pedido.id_produto.in_(subquery))

    # If filtering by status_ticket, we need to filter the orders.
    # EXISTS is usually faster than JOIN+DISTINCT for this scenario.
    if filters.status_ticket:
        status_str = filters.status_ticket.value if hasattr(
            filters.status_ticket, "value") else filters.status_ticket
        # using EXISTS with a correlated subquery
        query = query.where(
            select(Ticket.id_ticket)
            .where((Ticket.id_pedido == Pedido.id_pedido) & (Ticket.status == status_str))
            .exists()
        )

    # --- Optimizing the count ---
    # We do a fast count instead of a subquery if possible.
    # Because we've removed the JOIN+DISTINCT logic and replaced it with EXISTS/direct filters,
    # the count of `id_pedido` on the main query is now straightforward.

    # However, because we have `.join(Pedido.cliente)` and `.join(Pedido.produto)` potentially,
    # and they are N-1 or 1-1 relationships from the Order perspective (an order has one client, one product),
    # there is NO row duplication happening! Thus, `func.count()` works perfectly without distinct subqueries.

    count_query = query.with_only_columns(func.count(Pedido.id_pedido))
    # Reset order_by to avoid overhead during counting
    count_query = count_query.order_by(None)

    total = (await db.execute(count_query)).scalar_one()

    # --- Fetching data ---
    # We eager load the relationships that are needed
    query = query.options(selectinload(Pedido.produto),
                          selectinload(Pedido.cliente))

    result = await db.execute(query.offset(skip).limit(limit))
    data = result.scalars().all()

    return total, data


async def get_all_orders_for_export(
        db: AsyncSession,
        filters: OrderFilters
    ) -> list[Pedido]:

    query = select(Pedido)
    query, _ = filters_query(query, filters)
    
    result = await db.execute(query)
    return result.scalars().unique().all()


async def get_orders_stream(db: AsyncSession):
    query = select(Pedido).execution_options(yield_per=1000)
    result = await db.stream(query)

    async for row in result.scalars():
        yield row