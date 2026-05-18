from typing import List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.clickstream import Clickstream

async def get_clickstream_by_cliente_id(db: AsyncSession, id_cliente: str) -> Optional[Clickstream]:
    result = await db.execute(select(Clickstream).where(Clickstream.id_cliente == id_cliente))
    return result.scalars().first()

async def get_all_clickstreams(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 100,
    id_cliente: Optional[str] = None,
    total_sessoes_min: Optional[int] = None,
    total_sessoes_max: Optional[int] = None,
    total_eventos_min: Optional[int] = None,
    total_eventos_max: Optional[int] = None,
    data_ultima_sessao_start: Optional[str] = None,
    data_ultima_sessao_end: Optional[str] = None,
    qtd_visualizacao_produto_min: Optional[int] = None,
    qtd_visualizacao_produto_max: Optional[int] = None,
    qtd_adicoes_carrinho_min: Optional[int] = None,
    qtd_adicoes_carrinho_max: Optional[int] = None,
    qtd_abandonos_carrinho_min: Optional[int] = None,
    qtd_abandonos_carrinho_max: Optional[int] = None,
    qtd_compras_min: Optional[int] = None,
    qtd_compras_max: Optional[int] = None,
    canal_mais_usado: Optional[str] = None,
    dispositivo_mais_usado: Optional[str] = None,
) -> Tuple[int, List[Clickstream]]:
    stmt = select(Clickstream)

    if id_cliente:
        stmt = stmt.where(Clickstream.id_cliente == id_cliente)
    if total_sessoes_min is not None:
        stmt = stmt.where(Clickstream.total_sessoes >= total_sessoes_min)
    if total_sessoes_max is not None:
        stmt = stmt.where(Clickstream.total_sessoes <= total_sessoes_max)
    if total_eventos_min is not None:
        stmt = stmt.where(Clickstream.total_eventos >= total_eventos_min)
    if total_eventos_max is not None:
        stmt = stmt.where(Clickstream.total_eventos <= total_eventos_max)
    if data_ultima_sessao_start is not None:
        stmt = stmt.where(Clickstream.data_ultima_sessao >= data_ultima_sessao_start)
    if data_ultima_sessao_end is not None:
        stmt = stmt.where(Clickstream.data_ultima_sessao <= data_ultima_sessao_end)
    if qtd_visualizacao_produto_min is not None:
        stmt = stmt.where(Clickstream.qtd_visualizacao_produto >= qtd_visualizacao_produto_min)
    if qtd_visualizacao_produto_max is not None:
        stmt = stmt.where(Clickstream.qtd_visualizacao_produto <= qtd_visualizacao_produto_max)
    if qtd_adicoes_carrinho_min is not None:
        stmt = stmt.where(Clickstream.qtd_adicoes_carrinho >= qtd_adicoes_carrinho_min)
    if qtd_adicoes_carrinho_max is not None:
        stmt = stmt.where(Clickstream.qtd_adicoes_carrinho <= qtd_adicoes_carrinho_max)
    if qtd_abandonos_carrinho_min is not None:
        stmt = stmt.where(Clickstream.qtd_abandonos_carrinho >= qtd_abandonos_carrinho_min)
    if qtd_abandonos_carrinho_max is not None:
        stmt = stmt.where(Clickstream.qtd_abandonos_carrinho <= qtd_abandonos_carrinho_max)
    if qtd_compras_min is not None:
        stmt = stmt.where(Clickstream.qtd_compras >= qtd_compras_min)
    if qtd_compras_max is not None:
        stmt = stmt.where(Clickstream.qtd_compras <= qtd_compras_max)
    if canal_mais_usado:
        stmt = stmt.where(Clickstream.canal_mais_usado == canal_mais_usado)
    if dispositivo_mais_usado:
        stmt = stmt.where(Clickstream.dispositivo_mais_usado == dispositivo_mais_usado)
    
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    result = await db.execute(stmt.offset(skip).limit(limit))
    data = result.scalars().all()
    return total, data
