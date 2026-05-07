from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clients import Cliente
from app.schemas.clients import ClienteCreate


async def get_clients(
    db: AsyncSession,
    cidade: Optional[str] = None,
    valor_minimo: Optional[float] = None,
    frequencia_minima: Optional[int] = None,
    status_ticket: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[int, list[Cliente]]:
    query = select(Cliente)

    if cidade:
        query = query.where(Cliente.cidade == cidade)
    if valor_minimo is not None:
        query = query.where(Cliente.total_gasto_brl >= valor_minimo)
    if frequencia_minima is not None:
        query = query.where(Cliente.qtd_pedidos_realizados >= frequencia_minima)
    if status_ticket:
        from app.models.tickets import Ticket
        query = (
            query.join(Ticket, Ticket.cliente_id == Cliente.id_cliente)
            .where(Ticket.status == status_ticket)
            .distinct()
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(query.offset(skip).limit(limit))
    data = result.scalars().all()

    return total, data


async def get_client_by_id(db: AsyncSession, cliente_id: str) -> Optional[Cliente]:
    result = await db.execute(select(Cliente).where(Cliente.id_cliente == cliente_id))
    return result.scalar_one_or_none()


async def get_tickets_by_status(db: AsyncSession, cliente_id: str, status: str) -> list:
    from app.models.tickets import Ticket
    result = await db.execute(
        select(Ticket).where(Ticket.cliente_id == cliente_id, Ticket.status == status)
    )
    return result.scalars().all()


async def get_all_clients_for_export(db: AsyncSession) -> list[Cliente]:
    result = await db.execute(select(Cliente))
    return result.scalars().all()


async def create_client(db: AsyncSession, payload: ClienteCreate) -> Cliente:
    cliente = Cliente(**payload.model_dump())
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente