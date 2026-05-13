from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from enum import Enum

from app.api.deps import get_db
from app.services import orders as service
from app.schemas.orders import PedidoListOut

class StatusPedido(str, Enum):
    APROVADO    = "Aprovado"
    PROCESSANDO = "Processando"
    RECUSADO    = "Recusado"
    REEMBOLSADO = "Reembolsado"


class TipoCliente(str, Enum):
    CAMPEAO = "Campeão"
    CLIENTE_VIP = "Cliente VIP"
    CLIENTE_FIEL = "Cliente fiel"
    CLIENTE_REGULAR = "Cliente regular"
    NOVO_CLIENTE = "Novo cliente"
    EM_RISCO = "Em risco"
    INATIVO = "Inativo"


class StatusTicket(str, Enum):
    RESOLVIDO = "resolvido"
    ABERTO = "aberto"

router = APIRouter()


@router.get("/", response_model=PedidoListOut)
async def listar(
    status:        Optional[StatusPedido] = Query(None, description="Filtrar por status"),
    id_produto:    Optional[str] = Query(None, description="Filtrar por produto"),
    data_inicio:   Optional[str] = Query(None, description="Filtrar por data início (YYYY-MM-DD)"),
    data_fim:      Optional[str] = Query(None, description="Filtrar por data fim (YYYY-MM-DD)"),
    tipo_cliente:  Optional[TipoCliente] = Query(None, description="Filtrar por tipo do cliente (ex. Novo cliente)"),
    nome_produto:   Optional[str] = Query(None, description="Filtrar pelo nome do produto"),
    status_ticket: Optional[StatusTicket] = Query(None, description="Filtrar por status do ticket (resolvido, aberto)"),
    skip:        int           = Query(0,    ge=0),
    limit:       int           = Query(100,  ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    print(id_produto)
    return await service.listar_pedidos(
        db, status, id_produto, data_inicio, data_fim, tipo_cliente, status_ticket, nome_produto, skip, limit
    )


@router.get("/exportar")
async def exportar(db: AsyncSession = Depends(get_db)):
    output = await service.exportar_pedidos_csv(db)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pedidos.csv"},
    )