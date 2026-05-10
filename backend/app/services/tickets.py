from typing import Optional
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import tickets as crud
from app.schemas.tickets import TicketCreate, TicketUpdate, TicketOut


async def listar_tickets(
    db: AsyncSession,
    skip: int,
    limit: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> list:
    return await crud.get_tickets(db, skip=skip, limit=limit, start_date=start_date, end_date=end_date)


async def buscar_ticket(db: AsyncSession, ticket_id: int) -> TicketOut:
    ticket = await crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    return ticket


async def criar_ticket(db: AsyncSession, ticket: TicketCreate) -> TicketOut:
    return await crud.create_ticket(db, ticket)


async def atualizar_ticket(db: AsyncSession, ticket_id: int, ticket: TicketUpdate) -> TicketOut:
    db_ticket = await crud.update_ticket(db, ticket_id, ticket)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    return db_ticket


async def deletar_ticket(db: AsyncSession, ticket_id: int) -> dict:
    success = await crud.delete_ticket(db, ticket_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    return {"message": "Ticket deletado com sucesso"}