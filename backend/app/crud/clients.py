from typing import Optional
from datetime import date
from sqlalchemy import select, func, or_, cast, Float
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clients import Cliente
from app.schemas.clients import ClienteCreate

class client_filters:
    def __init__(
        self,
        ticket_min: Optional[float] = None,
        ticket_max: Optional[float] = None,
        lvt_min: Optional[float] = None,
        lvt_max: Optional[float] = None,
        data_inicio: Optional[date] = None,
        data_fim: Optional[date] = None,
        regiao: Optional[str] = None,
        status: Optional[str] = None,
    ):
        self.ticket_min = ticket_min
        self.ticket_max = ticket_max
        self.lvt_min = lvt_min
        self.lvt_max = lvt_max
        self.data_inicio = data_inicio
        self.data_fim = data_fim
        self.regiao = regiao
        self.status = status

def filters_query (query, filtros: client_filters):
    query = select(Cliente)

    # Convert to float to avoid integer division issues in SQLite/Postgres depending on the driver
    ticket_medio_exp = cast(Cliente.total_gasto_brl, Float) / func.nullif(cast(Cliente.qtd_pedidos_realizados, Float), 0)

    if filtros.ticket_min is not None:
        query = query.where(ticket_medio_exp >= filtros.ticket_min)

    if filtros.ticket_max is not None:
        query = query.where(ticket_medio_exp <= filtros.ticket_max)

    if filtros.lvt_min is not None:
        query = query.where(Cliente.total_gasto_brl >= filtros.lvt_min)

    if filtros.lvt_max is not None:
        query = query.where(Cliente.total_gasto_brl <= filtros.lvt_max)
        
    if filtros.data_inicio is not None:
        query = query.where(Cliente.data_ultima_compra >= filtros.data_inicio)
        
    if filtros.data_fim is not None:
        query = query.where(Cliente.data_ultima_compra <= filtros.data_fim)
        
    if filtros.regiao:
        query = query.where(Cliente.regiao.ilike(f"%{filtros.regiao}%"))

    # Segmento RFM
    if filtros.status:
        # Como o banco já retorna o segmento_rfm, o filtro busca diretamente nele
        query = query.where(Cliente.segmento_rfm.ilike(f"%{filtros.status}%"))

    return query

async def get_clients(
        db: AsyncSession,
        filtros: client_filters,
        frequencia_minima: Optional[int] = None,
        status_ticket: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        cidade: Optional[str] = None,
) -> tuple[int, list[Cliente]]:
    
    query = select(Cliente)

    query = filters_query(query, filtros)

    if search:
        # Busca parcial por nome (ignore case)
        query = query.where(
            Cliente.nome_cliente.ilike(f"%{search}%")
        )

    if cidade:
        query = query.where(Cliente.cidade == cidade)
    
    if frequencia_minima is not None:
        query = query.where(Cliente.qtd_pedidos_realizados >= frequencia_minima)

    if status_ticket:
        from app.models.tickets import Ticket
        query = (
            query.join(Ticket, Ticket.id_cliente == Cliente.id_cliente)
            .where(Ticket.status == status_ticket)
            .distinct()
        )

    # É vital que o count_query venha APÓS os filtros de busca para a paginação funcionar
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(query.offset(skip).limit(limit))
    data = result.scalars().all()

    return total, data


async def get_client_by_id(db: AsyncSession, cliente_id: str) -> Optional[Cliente]:
    result = await db.execute(select(Cliente).where(Cliente.id_cliente == cliente_id))
    return result.scalar_one_or_none()


async def get_tickets_by_status(db: AsyncSession, cliente_id: str, status: str) -> list:
    from app.models.tickets import Ticket
    status_str = status.value if hasattr(status, 'value') else status
    result = await db.execute(
        select(Ticket).where(Ticket.id_cliente == cliente_id, Ticket.status == status_str)
    )
    return result.scalars().all()


async def get_all_clients_for_export(
        db: AsyncSession,
        filtros: client_filters
    ) -> list[Cliente]:

    query = select(Cliente)
    query = filters_query(query, filtros)

    result = await db.execute(query)
    return result.scalars().all()


async def create_client(db: AsyncSession, payload: ClienteCreate) -> Cliente:
    cliente = Cliente(**payload.model_dump())
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente