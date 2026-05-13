from typing import Optional
from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tickets import Ticket as TicketModel
from app.schemas.tickets import TicketCreate, TicketUpdate


async def get_ticket(db: AsyncSession, ticket_id: str) -> Optional[TicketModel]:
    result = await db.execute(select(TicketModel).where(TicketModel.id_ticket == ticket_id))
    return result.scalar_one_or_none()


async def get_tickets(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> list[TicketModel]:
    query = select(TicketModel)

    if start_date and end_date:
        query = query.where(
            and_(
                TicketModel.data_abertura >= start_date,
                TicketModel.data_abertura <= end_date,
            )
        )

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


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
    db_ticket = await get_ticket(db, ticket_id)
    if not db_ticket:
        return None

    for field, value in ticket.model_dump(exclude_unset=True).items():
        setattr(db_ticket, field, value)

    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket


async def delete_ticket(db: AsyncSession, ticket_id: str) -> bool:
    db_ticket = await get_ticket(db, ticket_id)
    if not db_ticket:
        return False

    await db.delete(db_ticket)
    await db.commit()
    return True