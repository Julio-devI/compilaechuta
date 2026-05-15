from typing import Optional
from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import tickets as crud
from app.schemas.tickets import TicketCreate, TicketUpdate, TicketOut

VALID_TICKET_STATUS = {"aberto", "resolvido"}


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
    # Converter filtros para lowercase
    if agente is not None:
        agente = agente.lower()
    if tipo is not None:
        tipo = tipo.lower()
    if search is not None:
        search = search.lower()
    
    if status is not None and status not in VALID_TICKET_STATUS:
        raise HTTPException(
            status_code=400,
            detail='status deve ser "aberto" ou "resolvido"',
        )

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date deve ser anterior ou igual a end_date",
        )

    if skip < 0:
        raise HTTPException(
            status_code=400,
            detail="skip deve ser maior ou igual a 0",
        )

    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=400,
            detail="limit deve estar entre 1 e 500",
        )

    return await crud.get_all_tickets(
        db,
        skip=skip,
        limit=limit,
        start_date=start_date,
        end_date=end_date,
        status=status,
        agente=agente,
        tipo=tipo,
        search=search,
    )


async def buscar_ticket(db: AsyncSession, ticket_id: str) -> TicketOut:
    ticket = await crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    return ticket

async def buscar_ticket_por_pedido(db: AsyncSession, id_pedido: str) -> Optional[TicketOut]:
    ticket = await crud.get_ticket_by_pedido(db, id_pedido)
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