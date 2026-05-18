from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from enum import Enum

from app.api.deps import get_db
from app.services import orders as service
from app.schemas.orders import PedidoListOut


class StatusPedido(str, Enum):
    APROVADO = "Aprovado"
    PROCESSANDO = "Processando"
    RECUSADO = "Recusado"
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

class OrdersFilters:
    def __init__(
        self,
        status: Optional[StatusPedido] = Query(None, description="Filtrar por status"),
        id_pedido_display: Optional[str] = Query(None, description="Filtrar por SKU pedido"),
        data_inicio: Optional[str] = Query(None, description="Filtrar por data início (YYYY-MM-DD)"),
        data_fim: Optional[str] = Query(None, description="Filtrar por data fim (YYYY-MM-DD)"),
        nome_produto: Optional[str] = Query(None, description="Filtrar pelo nome do produto"),
        status_ticket: Optional[StatusTicket] = Query(None, description="Filtrar por status do ticket (resolvido, aberto)"),
        id_cliente: Optional[str] = Query(None, description="Filtrar por ID do cliente"),
    ):
        self.status = status
        self.id_pedido_display = id_pedido_display
        self.data_inicio = data_inicio
        self.data_fim = data_fim
        self.nome_produto = nome_produto
        self.status_ticket = status_ticket
        self.id_cliente = id_cliente

router = APIRouter()


@router.get("/", response_model=PedidoListOut)
async def listar(
    db: AsyncSession = Depends(get_db),
    filters: OrdersFilters = Depends(),
    tipo_cliente: Optional[TipoCliente] = Query(None, description="Filtrar por tipo do cliente (ex. Novo cliente)"),
    skip:        int = Query(0,    ge=0),
    limit:       int = Query(100,  ge=1, le=500),
):
    return await service.listar_pedidos(
        db=db,
        filters=filters,
        tipo_cliente=tipo_cliente,
        skip=skip,
        limit=limit
    )


@router.get("/exportar")
async def exportar(
    db: AsyncSession = Depends(get_db),
    filters: OrdersFilters = Depends(),
):
    output = await service.exportar_pedidos_csv(
        db=db, 
        filters=filters
    )
    
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pedidos.csv"},
    )
