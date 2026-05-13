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
        query = query.where(Pedido.id_pedido_display == id_produto)

    if data_inicio:
        query = query.where(Pedido.id_data >= data_inicio)

    if data_fim:
        query = query.where(Pedido.id_data <= data_fim)

    if tipo_cliente:
        tipo_str = tipo_cliente.value if hasattr(
            tipo_cliente, "value") else tipo_cliente
        query = query.join(Pedido.cliente).where(Cliente.segmento_rfm == tipo_str)

    if status_ticket:
        status_str = status_ticket.value if hasattr(status_ticket, "value") else status_ticket
        query = query.join(Pedido.tickets).where(Ticket.status == status_str)
        need_distinct = True

    if nome_produto:
        query = query.join(Pedido.produto).where(Produto.nome_produto.ilike(f"%{nome_produto}%"))

    if need_distinct:
        # Se juntamos 1:N (Tickets), precisamos de count distinct do ID do Pedido
        count_stmt = query.with_only_columns(
            func.count(func.distinct(Pedido.id_pedido))
        ).order_by(None)
    else:
        # Se não juntamos 1:N, um simples count() é o mais rápido
        count_stmt = query.with_only_columns(func.count()).order_by(None)

    try:
        total = (await db.execute(count_stmt)).scalar_one()
    except Exception:
        # Fallback caso a dialect do DB não consiga processar o with_only_columns() em queries complexas
        if need_distinct:
            fallback_count = select(func.count(func.distinct(Pedido.id_pedido))).select_from(query.subquery())
        else:
            fallback_count = select(func.count()).select_from(query.subquery())
        total = (await db.execute(fallback_count)).scalar_one()

    # Só aplicamos DISTINCT nos dados a serem exibidos se fizermos joins de "1 para N"
    if need_distinct:
        query = query.distinct()

    result = await db.execute(query.offset(skip).limit(limit))
    data = result.scalars().all()

    return total, data


async def get_all_orders_for_export(db: AsyncSession) -> list[Pedido]:
    result = await db.execute(select(Pedido))
    return result.scalars().all()