from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from app.api.deps import get_db
from app.services import tickets as service
from app.schemas.tickets import TicketCreate, TicketUpdate, TicketOut

router = APIRouter()


@router.get("/", response_model=list[TicketOut])
async def listar(
    skip:       int                = Query(0,    ge=0),
    limit:      int                = Query(100,  ge=1, le=500),
    start_date: Optional[date] = Query(None,description="Filtro início (YYYY-MM-DD)"),
    end_date: Optional[date] = Query( None,description="Filtro fim (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    return await service.listar_tickets(db, skip, limit, start_date, end_date)


@router.get("/pedido/{id_pedido}", response_model=TicketOut)
async def buscar_por_pedido(id_pedido: str, db: AsyncSession = Depends(get_db)):
    ticket = await service.buscar_ticket_por_pedido(db, id_pedido)
    if not ticket:
        raise HTTPException(status_code=404, detail="Nenhum ticket encontrado para este pedido")
    return ticket


@router.get("/{ticket_id}", response_model=TicketOut)
async def buscar(ticket_id: str, db: AsyncSession = Depends(get_db)):
    return await service.buscar_ticket(db, ticket_id)


@router.post("/", response_model=TicketOut, status_code=201)
async def criar(ticket: TicketCreate, db: AsyncSession = Depends(get_db)):
    return await service.criar_ticket(db, ticket)


@router.patch("/{ticket_id}", response_model=TicketOut)
async def atualizar(ticket_id: str, ticket: TicketUpdate, db: AsyncSession = Depends(get_db)):
    return await service.atualizar_ticket(db, ticket_id, ticket)


@router.delete("/{ticket_id}")
async def deletar(ticket_id: str, db: AsyncSession = Depends(get_db)):
    return await service.deletar_ticket(db, ticket_id)