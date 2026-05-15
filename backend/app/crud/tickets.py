from typing import Optional
from datetime import date, datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import select, or_, func, Table, MetaData, Column, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clients import Cliente
from app.models.tickets import Ticket as TicketModel
from app.schemas.tickets import TicketCreate, TicketUpdate

vendas_table = Table(
    "fato_vendas",
    MetaData(),
    Column("id_pedido", String),
    Column("id_pedido_display", String),
)


def _map_ticket_to_dict(
    ticket: TicketModel,
    id_pedido_display: Optional[str] = None,
    nome_cliente: Optional[str] = None,
) -> dict:
    data = ticket.__dict__.copy()
    data.pop("_sa_instance_state", None)
    data["id_pedido_display"] = id_pedido_display
    data["nome_cliente"] = nome_cliente
    return data


async def get_ticket_by_id(db: AsyncSession, ticket_id: str) -> Optional[dict]:
    subquery = (
        select(
            vendas_table.c.id_pedido,
            func.max(vendas_table.c.id_pedido_display).label("id_pedido_display"),
        )
        .group_by(vendas_table.c.id_pedido)
        .subquery()
    )

    query = (
        select(TicketModel, subquery.c.id_pedido_display, Cliente.nome_cliente)
        .outerjoin(subquery, TicketModel.id_pedido == subquery.c.id_pedido)
        .outerjoin(Cliente, TicketModel.id_cliente == Cliente.id_cliente)
        .where(TicketModel.id_ticket == ticket_id)
    )

    result = await db.execute(query)
    record = result.one_or_none()
    if record is None:
        return None

    ticket, id_pedido_display, nome_cliente = record
    return _map_ticket_to_dict(ticket, id_pedido_display, nome_cliente)


async def get_all_tickets(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    agente: Optional[str] = None,
    tipo: Optional[str] = None,
    search: Optional[str] = None,
) -> list[TicketModel]:
    subquery = (
        select(
            vendas_table.c.id_pedido,
            func.max(vendas_table.c.id_pedido_display).label("id_pedido_display"),
        )
        .group_by(vendas_table.c.id_pedido)
        .subquery()
    )

    query = select(TicketModel, subquery.c.id_pedido_display, Cliente.nome_cliente).outerjoin(
        subquery, TicketModel.id_pedido == subquery.c.id_pedido
    ).outerjoin(
        Cliente, TicketModel.id_cliente == Cliente.id_cliente
    )

    # Convertemos a coluna datetime do banco para Date na hora de comparar
    if start_date:
        query = query.where(func.date(TicketModel.data_abertura) >= start_date)
    if end_date:
        query = query.where(func.date(TicketModel.data_abertura) <= end_date)

    # Filtros de Status e Categoria (Módulo 2 do Case)
    if status:
        query = query.where(TicketModel.status == status)
    if agente:
        query = query.where(TicketModel.agente_suporte.ilike(f"%{agente}%"))
    if tipo:
        query = query.where(TicketModel.tipo_problema.ilike(f"%{tipo}%"))

    # Busca Global (ID ou Nome do Cliente)
    if search:
        query = query.where(
            or_(
                TicketModel.id_ticket.ilike(f"%{search}%"),
                Cliente.nome_cliente.ilike(f"%{search}%")
            )
        )

    result = await db.execute(query.offset(skip).limit(limit))
    records = result.all()

    return [
        _map_ticket_to_dict(ticket, id_pedido_display, nome_cliente)
        for ticket, id_pedido_display, nome_cliente in records
    ]


async def get_ticket_count(
    db: AsyncSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    agente: Optional[str] = None,
    tipo: Optional[str] = None,
    search: Optional[str] = None,
) -> int:
    query = select(func.count(TicketModel.id_ticket))

    if start_date:
        query = query.where(func.date(TicketModel.data_abertura) >= start_date)
    if end_date:
        query = query.where(func.date(TicketModel.data_abertura) <= end_date)
    if status:
        query = query.where(TicketModel.status == status)
    if agente:
        query = query.where(TicketModel.agente_suporte.ilike(f"%{agente}%"))
    if tipo:
        query = query.where(TicketModel.tipo_problema.ilike(f"%{tipo}%"))
    if search:
        query = query.join(TicketModel.cliente)
        query = query.where(
            or_(
                TicketModel.id_ticket.ilike(f"%{search}%"),
                Cliente.nome_cliente.ilike(f"%{search}%")
            )
        )

    result = await db.execute(query)
    return result.scalar_one()


async def get_ticket_summary(db: AsyncSession) -> dict:
    total_result = await db.execute(select(func.count(TicketModel.id_ticket)))
    open_result = await db.execute(
        select(func.count(TicketModel.id_ticket)).where(TicketModel.status == "aberto")
    )
    resolved_result = await db.execute(
        select(func.count(TicketModel.id_ticket)).where(TicketModel.status == "resolvido")
    )
    average_result = await db.execute(
        select(func.avg(TicketModel.tempo_resolucao_horas)).where(
            TicketModel.status == "resolvido",
            TicketModel.tempo_resolucao_horas.isnot(None),
        )
    )
    agents_result = await db.execute(
        select(TicketModel.agente_suporte)
        .where(TicketModel.agente_suporte.isnot(None), TicketModel.agente_suporte != "")
        .distinct()
        .order_by(TicketModel.agente_suporte)
    )
    problem_types_result = await db.execute(
        select(TicketModel.tipo_problema)
        .where(TicketModel.tipo_problema.isnot(None), TicketModel.tipo_problema != "")
        .distinct()
        .order_by(TicketModel.tipo_problema)
    )

    return {
        "total": total_result.scalar_one(),
        "open": open_result.scalar_one(),
        "resolved": resolved_result.scalar_one(),
        "average_resolution_time_hours": average_result.scalar_one() or 0,
        "agents": list(agents_result.scalars().all()),
        "problem_types": list(problem_types_result.scalars().all()),
    }

async def create_ticket(db: AsyncSession, ticket: TicketCreate) -> TicketModel:
    dados = ticket.model_dump()

    db_ticket = TicketModel(
        id_ticket=str(uuid4()),
        data_abertura=datetime.now(ZoneInfo("America/Sao_Paulo")).replace(microsecond=0),
        **dados
    )

    db.add(db_ticket)
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket


async def update_ticket(
    db: AsyncSession, ticket_id: str, ticket: TicketUpdate
) -> Optional[TicketModel]:
    db_ticket = await get_ticket_by_id(db, ticket_id)
    if not db_ticket:
        return None
    
    dados = ticket.model_dump(exclude_unset=True)

    # Converter UTC → São Paulo
    if dados.get("data_resolucao"):
        dados["data_resolucao"] = (
            dados["data_resolucao"]
            .astimezone(ZoneInfo("America/Sao_Paulo"))
            .replace(tzinfo=None, microsecond=0)
        )


    for field, value in dados.items():
        setattr(db_ticket, field, value)

    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket


async def delete_ticket(db: AsyncSession, ticket_id: str) -> bool:
    db_ticket = await get_ticket_by_id(db, ticket_id)
    if not db_ticket:
        return False

    await db.delete(db_ticket)
    await db.commit()
    return True
