from typing import Optional
from datetime import date, datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import select, or_, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clients import Cliente
from app.models.tickets import Ticket as TicketModel
from app.schemas.tickets import TicketCreate, TicketUpdate


async def get_ticket_by_id(db: AsyncSession, ticket_id: str) -> Optional[TicketModel]:
    result = await db.execute(select(TicketModel).where(TicketModel.id_ticket == ticket_id))
    return result.scalar_one_or_none()


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
    query = select(TicketModel)

    # Convertemos a coluna datetime do banco para Date na hora de comparar
    if start_date:
        query = query.where(cast(TicketModel.data_abertura, Date) >= start_date)
    if end_date:
        query = query.where(cast(TicketModel.data_abertura, Date) <= end_date)

    # Filtros de Status e Categoria (Módulo 2 do Case)
    if status:
        query = query.where(TicketModel.status == status)
    if agente:
        query = query.where(TicketModel.agente_suporte == agente)
    if tipo:
        query = query.where(TicketModel.tipo_problema == tipo)

    # Busca Global (ID ou Nome do Cliente)
    if search:
        query = query.join(TicketModel.cliente)
        query = query.where(
            or_(
                TicketModel.id_ticket.ilike(f"%{search}%"),
                Cliente.nome_cliente.ilike(f"%{search}%")
            )
        )

    result = await db.execute(query.offset(skip).limit(limit))
    return list(result.scalars().all())

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