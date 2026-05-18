from typing import Optional
from datetime import date
from sqlalchemy import select, func, or_, cast, Float
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clients import Cliente
from app.schemas.clients import ClienteCreate


class client_filters:
    def __init__(
        self,
        ticket_min:    Optional[float] = None,
        ticket_max:    Optional[float] = None,
        lvt_min:       Optional[float] = None,
        lvt_max:       Optional[float] = None,
        data_inicio:   Optional[date]  = None,
        data_fim:      Optional[date]  = None,
        regiao:        Optional[str]   = None,
        status:        Optional[str]   = None,
        sem_ticket:    Optional[bool]  = None,
        nps:           Optional[str]   = None,
        csat:          Optional[str]   = None,
        sku:           Optional[str]   = None,
        categoria:     Optional[str]   = None,
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


def filters_query(query, filters: client_filters):
    query = select(Cliente)

    ticket_medio_exp = cast(Cliente.total_gasto_brl, Float) / func.nullif(
        cast(Cliente.qtd_pedidos_realizados, Float), 0
    )

    if filters.ticket_min is not None:
        query = query.where(ticket_medio_exp >= filters.ticket_min)
    if filters.ticket_max is not None:
        query = query.where(ticket_medio_exp <= filters.ticket_max)

    if filters.lvt_min is not None:
        query = query.where(Cliente.total_gasto_brl >= filters.lvt_min)
    if filters.lvt_max is not None:
        query = query.where(Cliente.total_gasto_brl <= filters.lvt_max)

    if filters.data_inicio is not None:
        query = query.where(Cliente.data_ultima_compra >= filters.data_inicio)
    if filters.data_fim is not None:
        query = query.where(Cliente.data_ultima_compra <= filters.data_fim)

    if filters.regiao:
        query = query.where(Cliente.regiao.ilike(f"%{filters.regiao}%"))

    if filters.status:
        query = query.where(Cliente.segmento_rfm.ilike(f"%{filters.status}%"))

    # Sem ticket: apenas clientes sem nenhum ticket de suporte
    if filters.sem_ticket:
        query = query.where(Cliente.qtd_tickets_suporte == 0)

    # NPS derivado de media_estrelas_dadas
    # Promotor: >= 4, Neutro: == 3, Detrator: < 3
    if filters.nps:
        nps = filters.nps.lower()
        if "promotor" in nps:
            query = query.where(Cliente.media_estrelas_dadas >= 4)
        elif "neutro" in nps:
            query = query.where(
                Cliente.media_estrelas_dadas >= 3,
                Cliente.media_estrelas_dadas < 4,
            )
        elif "detrator" in nps:
            query = query.where(Cliente.media_estrelas_dadas < 3)

    # CSAT derivado de media_estrelas_dadas
    # Satisfeito: >= 4, Insatisfeito: < 4
    if filters.csat:
        csat = filters.csat.lower()
        if "satisfeito" in csat and "insatisfeito" not in csat:
            query = query.where(Cliente.media_estrelas_dadas >= 4)
        elif "insatisfeito" in csat:
            query = query.where(Cliente.media_estrelas_dadas < 4)

    # SKU: clientes que compraram um produto com esse SKU (via fato_vendas + dim_produto)
    if filters.sku:
        from app.models.orders import Pedido
        from app.models.products import Produto

        sku_subq = (
            select(Pedido.id_cliente)
            .join(Produto, Pedido.id_produto == Produto.id_produto)
            .where(Produto.sku.ilike(f"%{filters.sku}%"))
            .distinct()
        )
        query = query.where(Cliente.id_cliente.in_(sku_subq))

    # Categoria: clientes cuja categoria de MAIOR interesse corresponde ao filtro
    # (mesma lógica do campo categoriaInteresse exibido na tabela)
    if filters.categoria:
        from app.models.orders_evaluation import AvaliacaoPedido
        from app.models.category import Categoria

        inner = (
            select(
                AvaliacaoPedido.id_cliente.label("id_cliente"),
                Categoria.nome_categoria.label("nome_categoria"),
                func.count().label("cnt"),
            )
            .join(Categoria, AvaliacaoPedido.id_categoria == Categoria.id_categoria)
            .group_by(AvaliacaoPedido.id_cliente, Categoria.nome_categoria)
            .subquery("inner_cat")
        )

        max_cnt = (
            select(
                inner.c.id_cliente.label("id_cliente"),
                func.max(inner.c.cnt).label("max_cnt"),
            )
            .group_by(inner.c.id_cliente)
            .subquery("max_cnt_cat")
        )

        top_cat_clients = (
            select(inner.c.id_cliente)
            .join(
                max_cnt,
                (inner.c.id_cliente == max_cnt.c.id_cliente)
                & (inner.c.cnt == max_cnt.c.max_cnt),
            )
            .where(inner.c.nome_categoria.ilike(f"%{filters.categoria}%"))
            .distinct()
        )

        query = query.where(Cliente.id_cliente.in_(top_cat_clients))

    return query


async def get_clients(
    db: AsyncSession,
    filters: client_filters,
    frequencia_minima: Optional[int] = None,
    status_ticket:     Optional[str] = None,
    skip:              int = 0,
    limit:             int = 100,
    search:            Optional[str] = None,
    cidade:            Optional[str] = None,
) -> tuple[int, list[Cliente]]:

    query = filters_query(None, filters)

    if search:
        query = query.where(Cliente.nome_cliente.ilike(f"%{search}%"))

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

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(query.offset(skip).limit(limit))
    data = result.scalars().all()

    return total, data


async def get_top_categories(
    db: AsyncSession, client_ids: list[str]
) -> dict[str, str]:
    """Retorna {id_cliente: nome_categoria_mais_comprada} para os clientes fornecidos."""
    if not client_ids:
        return {}

    from app.models.orders_evaluation import AvaliacaoPedido
    from app.models.category import Categoria

    stmt = (
        select(
            AvaliacaoPedido.id_cliente,
            Categoria.nome_categoria,
            func.count().label("cnt"),
        )
        .join(Categoria, AvaliacaoPedido.id_categoria == Categoria.id_categoria)
        .where(AvaliacaoPedido.id_cliente.in_(client_ids))
        .group_by(AvaliacaoPedido.id_cliente, Categoria.nome_categoria)
        .order_by(AvaliacaoPedido.id_cliente, func.count().desc())
    )

    result = await db.execute(stmt)
    top: dict[str, str] = {}
    for row in result.all():
        if row.id_cliente not in top:
            top[row.id_cliente] = row.nome_categoria
    return top


async def get_open_ticket_clients(db: AsyncSession, client_ids: list[str]) -> set:
    """Returns set of client IDs that have at least one open ticket."""
    if not client_ids:
        return set()
    from app.models.tickets import Ticket
    stmt = (
        select(Ticket.id_cliente)
        .where(Ticket.id_cliente.in_(client_ids))
        .where(Ticket.status == 'aberto')
        .distinct()
    )
    result = await db.execute(stmt)
    return {row[0] for row in result.all()}


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
    filters: client_filters,
) -> list[Cliente]:
    query = filters_query(None, filters)
    result = await db.execute(query)
    return result.scalars().all()


async def create_client(db: AsyncSession, payload: ClienteCreate) -> Cliente:
    cliente = Cliente(**payload.model_dump())
    db.add(cliente)
    await db.commit()
    await db.refresh(cliente)
    return cliente
