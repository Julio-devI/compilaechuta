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


from fastapi import Query
from typing import Optional
from datetime import date

class ClientFilters:
    def __init__(
        self,
        ticket_min: Optional[float] = Query(None, description="Filtra por ticket medio minimo"),
        ticket_max: Optional[float] = Query(None, description="Filtra por ticket medio maximo"),
        lvt_min: Optional[float] = Query(None, description="Filtra por LVT mínimo"),
        lvt_max: Optional[float] = Query(None, description="Filtra por LVT máximo"),
        data_inicio: Optional[date] = Query(None, description="Data inicial"),
        data_fim: Optional[date] = Query(None, description="Data final"),
        regiao: Optional[str] = Query(None, description="Filtro de região"),
        status: Optional[str] = Query(None, description="Status VIP/Recorrente"),
    ):
        self.ticket_min = ticket_min
        self.ticket_max = ticket_max
        self.lvt_min = lvt_min
        self.lvt_max = lvt_max
        self.data_inicio = data_inicio
        self.data_fim = data_fim
        self.regiao = regiao
        self.status = status


router = APIRouter()


@router.get("/", response_model=ClienteListOut)
async def listar(

    db: AsyncSession = Depends(get_db),
    filtros: ClientFilters = Depends(),
    search:            Optional[str]   = Query(None, description="Busca por nome ou email"), # NOVO
    frequencia_minima: Optional[int]   = Query(None, ge=0, description="Frequência mínima de compras"),
    status_ticket:     Optional[StatusTicket] = Query(None, description="Filtrar por status de ticket"),
    skip:              int             = Query(0,   ge=0),
    limit:             int             = Query(100, ge=1, le=500),
):
    return await service.listar_clientes(
        db=db,
        filtros=filtros,
        search=search,
        frequencia_minima=frequencia_minima,
        status_ticket=status_ticket,
        skip=skip,
        limit=limit
    )


@router.get("/exportar")
async def exportar(

    db: AsyncSession = Depends(get_db),
    filtros: ClientFilters = Depends()   
):
    
    output = await service.exportar_clientes_csv(
        db=db,
        filtros=filtros
    )

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