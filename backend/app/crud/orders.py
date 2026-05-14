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
    nome_produto: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[int, list[Pedido]]:
    query = select(Pedido)

    need_distinct = False

    if status:
        status_str = status.value if hasattr(status, "value") else status
        query = query.where(Pedido.status == status_str)

    if id_produto:
        query = query.where(Pedido.id_pedido_display.ilike(f"%{id_produto}%"))

    if data_inicio:
        query = query.where(Pedido.id_data >= data_inicio)

    if data_fim:
        query = query.where(Pedido.id_data <= data_fim)

    if tipo_cliente:
        tipo_str = tipo_cliente.value if hasattr(
            tipo_cliente, "value") else tipo_cliente
        query = query.join(Pedido.cliente).where(
            Cliente.segmento_rfm == tipo_str)

    if status_ticket:
        status_str = status_ticket.value if hasattr(
            status_ticket, "value") else status_ticket
        query = query.join(Pedido.tickets).where(Ticket.status == status_str)
        need_distinct = True

    if nome_produto:
        query = query.join(Pedido.produto).where(
            Produto.nome_produto.ilike(f"%{nome_produto}%"))

    # Sempre usa subquery para garantir contagem correta, especialmente com joins 1:N
    if need_distinct:
        count_subq = query.order_by(None).distinct(Pedido.id_pedido)
    else:
        count_subq = query.order_by(None)
    total = (await db.execute(
        select(func.count()).select_from(count_subq.subquery())
    )).scalar_one()

    # Só aplicamos DISTINCT nos dados a serem exibidos se fizermos joins de "1 para N"
    if need_distinct:
        query = query.distinct()

    result = await db.execute(query.offset(skip).limit(limit))
    data = result.scalars().all()

    return total, data


async def get_orders_stream(db: AsyncSession):
    query = select(Pedido).execution_options(yield_per=1000)
    result = await db.stream(query)

    async for row in result.scalars():
        yield row
