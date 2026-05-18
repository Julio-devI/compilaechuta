import csv
import io
from typing import Optional
from datetime import date

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import clients as crud
from app.crud import products as crud_products
from app.schemas.clients import ClienteCreate, ClienteListOut, ClienteOut
from app.schemas.products import ProductListOut


class ClientFilters:
    def __init__(
        self,
        ticket_min:  Optional[float] = None,
        ticket_max:  Optional[float] = None,
        lvt_min:     Optional[float] = None,
        lvt_max:     Optional[float] = None,
        data_inicio: Optional[date]  = None,
        data_fim:    Optional[date]  = None,
        regiao:      Optional[str]   = None,
        status:      Optional[str]   = None,
        sem_ticket:  Optional[bool]  = None,
        nps:         Optional[str]   = None,
        csat:        Optional[str]   = None,
        sku:         Optional[str]   = None,
        categoria:   Optional[str]   = None,
    ):
        self.ticket_min  = ticket_min
        self.ticket_max  = ticket_max
        self.lvt_min     = lvt_min
        self.lvt_max     = lvt_max
        self.data_inicio = data_inicio
        self.data_fim    = data_fim
        self.regiao      = regiao
        self.status      = status
        self.sem_ticket  = sem_ticket
        self.nps         = nps
        self.csat        = csat
        self.sku         = sku
        self.categoria   = categoria


async def listar_clientes(
    db: AsyncSession,
    filters: ClientFilters,
    cidade:            Optional[str] = None,
    status_ticket:     Optional[str] = None,
    frequencia_minima: Optional[int] = None,
    skip:              int = 0,
    limit:             int = 100,
    search:            str = None,
) -> ClienteListOut:
    total, clientes = await crud.get_clients(
        db=db,
        filters=filters,
        cidade=cidade,
        frequencia_minima=frequencia_minima,
        status_ticket=status_ticket,
        skip=skip,
        limit=limit,
        search=search,
    )

    client_ids = [c.id_cliente for c in clientes]
    categorias = await crud.get_top_categories(db, client_ids)
    open_ticket_ids = await crud.get_open_ticket_clients(db, client_ids)

    data = []
    for c in clientes:
        out = ClienteOut.model_validate(c)
        out.categoria_interesse = categorias.get(c.id_cliente)
        out.tem_ticket_aberto = c.id_cliente in open_ticket_ids
        data.append(out)

    return ClienteListOut(total=total, skip=skip, limit=limit, data=data)


async def buscar_cliente(db: AsyncSession, cliente_id: str) -> ClienteOut:
    cliente = await crud.get_client_by_id(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente


async def listar_tickets_cliente(db: AsyncSession, cliente_id: str, status: str) -> list:
    await buscar_cliente(db, cliente_id)
    return await crud.get_tickets_by_status(db, cliente_id, status)


async def listar_produtos_cliente(
    db: AsyncSession, cliente_id: str, skip: int = 0, limit: int = 100
) -> ProductListOut:
    await buscar_cliente(db, cliente_id)
    total, data = await crud_products.get_products_by_cliente(db, cliente_id, skip=skip, limit=limit)
    return ProductListOut(total=total, skip=skip, limit=limit, data=data)


async def exportar_clientes_csv(
    db: AsyncSession,
    filters: ClientFilters,
) -> io.StringIO:
    clientes = await crud.get_all_clients_for_export(db=db, filters=filters)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id_cliente", "nome_cliente", "cidade", "estado", "regiao",
        "qtd_pedidos_realizados", "total_gasto_brl", "qtd_tickets_suporte",
        "data_ultima_compra", "media_estrelas_dadas", "segmento_rfm",
    ])
    for c in clientes:
        writer.writerow([
            c.id_cliente, c.nome_cliente, c.cidade, c.estado, c.regiao,
            c.qtd_pedidos_realizados, c.total_gasto_brl, c.qtd_tickets_suporte,
            c.data_ultima_compra, c.media_estrelas_dadas, c.segmento_rfm,
        ])
    output.seek(0)
    return output
