from enum import Enum
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from app.api.deps import get_db
from app.services import clients as service
from app.schemas.clients import ClienteListOut, ClienteOut


class StatusTicket(str, Enum):
    ABERTO = "aberto"
    RESOLVIDO = "resolvido"


router = APIRouter()


@router.get("/", response_model=ClienteListOut)
async def listar(
    ticket_min:        Optional[float] = Query(None, description="Filtra por ticket medio minimo"),
    ticket_max:        Optional[float] = Query(None, description="Filtra por ticket medio maximo"),
    lvt_min:           Optional[float] = Query(None, description="Filtra por LVT mínimo"),
    lvt_max:           Optional[float] = Query(None, description="Filtra por LVT máximo"),
    data_inicio:       Optional[date]  = Query(None, description="Data do último pedido inicial"),
    data_fim:          Optional[date]  = Query(None, description="Data do último pedido final"),
    regiao:            Optional[str]   = Query(None, description="Filtro de região"),
    search:            Optional[str]   = Query(None, description="Busca por nome ou email"), # NOVO
    status:            Optional[str]   = Query(None, description="Filtrar por status VIP/Recorrente"), # NOVO
    cidade:            Optional[str]   = Query(None, description="Filtrar por cidade"),
    frequencia_minima: Optional[int]   = Query(None, ge=0, description="Frequência mínima de compras"),
    status_ticket:     Optional[StatusTicket] = Query(None, description="Filtrar por status de ticket"),
    skip:              int             = Query(0,   ge=0),
    limit:             int             = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    return await service.listar_clientes(
        db=db, 
        cidade=cidade, 
        frequencia_minima=frequencia_minima, 
        status_ticket=status_ticket, 
        skip=skip, 
        limit=limit, 
        search=search, 
        status=status, 
        ticket_min=ticket_min, 
        ticket_max=ticket_max,
        lvt_min=lvt_min,
        lvt_max=lvt_max,
        data_inicio=data_inicio,
        data_fim=data_fim,
        regiao=regiao
    )


@router.get("/exportar")
async def exportar(db: AsyncSession = Depends(get_db)):
    output = await service.exportar_clientes_csv(db)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=clientes.csv"},
    )


@router.get("/{cliente_id}", response_model=ClienteOut)
async def buscar(cliente_id: str, db: AsyncSession = Depends(get_db)):
    return await service.buscar_cliente(db, cliente_id)


@router.get("/{cliente_id}/tickets")
async def tickets(
    cliente_id: str,
    status: StatusTicket = Query(..., description="Status dos tickets: aberto | resolvido"),
    db: AsyncSession = Depends(get_db),
):
    return await service.listar_tickets_cliente(db, cliente_id, status)