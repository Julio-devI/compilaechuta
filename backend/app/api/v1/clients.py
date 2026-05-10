from enum import Enum
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.deps import get_db
from app.services import clients as service
from app.schemas.clients import ClienteListOut, ClienteOut


class StatusTicket(str, Enum):
    ABERTO = "aberto"
    RESOLVIDO = "resolvido"


router = APIRouter()


@router.get("/", response_model=ClienteListOut)
async def listar(
    cidade:            Optional[str]   = Query(None, description="Filtrar por cidade"),
    valor_minimo:      Optional[float] = Query(None, ge=0, description="Total gasto mínimo (R$)"),
    frequencia_minima: Optional[int]   = Query(None, ge=0, description="Frequência mínima de compras"),
    status_ticket:     Optional[StatusTicket] = Query(None, description="Filtrar por status de ticket: aberto | resolvido"),
    skip:              int             = Query(0,   ge=0),
    limit:             int             = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    return await service.listar_clientes(db, cidade, valor_minimo, frequencia_minima, status_ticket, skip, limit)


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