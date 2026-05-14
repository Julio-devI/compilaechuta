from typing import Optional
from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import tickets as crud
from app.schemas.tickets import TicketCreate, TicketUpdate, TicketOut


async def get_all_tickets(
    db: AsyncSession,
    skip: int,
    limit: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    agente: Optional[str] = None,
    tipo: Optional[str] = None,
    search: Optional[str] = None,
) -> list:
    return await crud.get_all_tickets(db, skip=skip, limit=limit, start_date=start_date, end_date=end_date, status=status, agente=agente, tipo=tipo, search=search)


async def get_ticket_by_id(db: AsyncSession, ticket_id: str) -> TicketOut:
    ticket = await crud.get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    return ticket


async def create_ticket(db: AsyncSession, ticket: TicketCreate) -> TicketOut:
    return await crud.create_ticket(db, ticket)


async def update_ticket(db: AsyncSession, ticket_id: str, ticket: TicketUpdate) -> TicketOut:
    db_ticket = await crud.update_ticket(db, ticket_id, ticket)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    return db_ticket


async def delete_ticket(db: AsyncSession, ticket_id: str) -> dict:
    success = await crud.delete_ticket(db, ticket_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    return {"message": "Ticket deletado com sucesso"}