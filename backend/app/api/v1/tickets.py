from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from app.api.deps import get_db
from app.services import tickets as service
from app.schemas.tickets import TicketCreate, TicketUpdate, TicketOut

router = APIRouter()


@router.get("/", response_model=list[TicketOut])
async def get_all_tickets(
    skip:       int                = Query(0,    ge=0),
    limit:      int                = Query(100,  ge=1, le=500),
    start_date: Optional[date] = Query(None,description="Filtro início (YYYY-MM-DD)"),
    end_date: Optional[date] = Query( None,description="Filtro fim (YYYY-MM-DD)"),
    status:     Optional[str]  = Query(None, description="Status do ticket (Aberto/Resolvido)"),
    agente_id:  Optional[str]  = Query(None, description="Filtrar por agente específico"),
    tipo:       Optional[str]  = Query(None, description="Filtrar por tipo de problema"),
    search:     Optional[str]  = Query(None, description="Busca por ID do ticket ou cliente"),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_all_tickets(db, skip, limit, start_date, end_date, status, agente_id, tipo, search)


@router.get("/{ticket_id}", response_model=TicketOut)
async def get_ticket_by_id(ticket_id: str, db: AsyncSession = Depends(get_db)):
    return await service.get_ticket_by_id(db, ticket_id)


@router.post("/", response_model=TicketOut, status_code=201)
async def create_ticket(ticket: TicketCreate, db: AsyncSession = Depends(get_db)):
    return await service.criar_ticket(db, ticket)


@router.patch("/{ticket_id}", response_model=TicketOut)
async def update_ticket(ticket_id: str, ticket: TicketUpdate, db: AsyncSession = Depends(get_db)):
    return await service.atualizar_ticket(db, ticket_id, ticket)


@router.delete("/{ticket_id}")
async def delete_ticket(ticket_id: str, db: AsyncSession = Depends(get_db)):
    return await service.deletar_ticket(db, ticket_id)