from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Categoria
from app.models.orders_evaluation import AvaliacaoPedido

async def get_evaluation_by_id(db: AsyncSession, id_avaliacao: str) -> Optional[AvaliacaoPedido]:
    result = await db.execute(select(AvaliacaoPedido).where(AvaliacaoPedido.id_avaliacao == id_avaliacao))
    return result.scalars().first()

async def get_evaluations_by_product_id(db: AsyncSession, id_produto: str, limit: int = 5) -> List[str]:
    result = await db.execute(
        select(AvaliacaoPedido.comentario)
        .where(
            AvaliacaoPedido.id_produto == id_produto, 
            AvaliacaoPedido.comentario.isnot(None),
            AvaliacaoPedido.comentario_consistente == True
        )
        .order_by(AvaliacaoPedido.data_avaliacao.desc())
        .limit(limit)
    )
    return list(result.scalars().all())

async def get_all_evaluations(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 100,
    id_pedido: Optional[str] = None,
    id_produto: Optional[str] = None,
    id_cliente: Optional[str] = None,
    categoria: Optional[str] = None,
    metodo_pagamento: Optional[str] = None,
    status: Optional[str] = None,
    categoria_nps: Optional[str] = None,
    recomenda: Optional[bool] = None,
    nota_produto_min: Optional[float] = None,
    nota_produto_max: Optional[float] = None,
    preco_min: Optional[float] = None,
    preco_max: Optional[float] = None,
    valor_pedido_min: Optional[float] = None,
    valor_pedido_max: Optional[float] = None,
    quantidade_min: Optional[float] = None,
    quantidade_max: Optional[float] = None,
    nota_nps_min: Optional[float] = None,
    nota_nps_max: Optional[float] = None,
    pct_recomendacoes_sim_min: Optional[float] = None,
    pct_recomendacoes_sim_max: Optional[float] = None,
    data_pedido_start: Optional[datetime] = None,
    data_pedido_end: Optional[datetime] = None,
    data_avaliacao_start: Optional[datetime] = None,
    data_avaliacao_end: Optional[datetime] = None,
) -> Tuple[int, List[AvaliacaoPedido]]:
    stmt = select(AvaliacaoPedido)

    if id_pedido:
        stmt = stmt.where(AvaliacaoPedido.id_pedido == id_pedido)
    if id_produto:
        stmt = stmt.where(AvaliacaoPedido.id_produto == id_produto)
    if id_cliente:
        stmt = stmt.where(AvaliacaoPedido.id_cliente == id_cliente)
    if categoria:
        stmt = stmt.join(Categoria, AvaliacaoPedido.id_categoria == Categoria.id_categoria)
        stmt = stmt.where(Categoria.nome_categoria.ilike(f"%{categoria}%"))
    if metodo_pagamento:
        stmt = stmt.where(AvaliacaoPedido.metodo_pagamento == metodo_pagamento)
    if status:
        stmt = stmt.where(AvaliacaoPedido.status == status)
    if categoria_nps:
        stmt = stmt.where(AvaliacaoPedido.categoria_nps == categoria_nps)
    if recomenda is not None:
        stmt = stmt.where(AvaliacaoPedido.recomenda == recomenda)

    if nota_produto_min is not None:
        stmt = stmt.where(AvaliacaoPedido.nota_produto >= nota_produto_min)
    if nota_produto_max is not None:
        stmt = stmt.where(AvaliacaoPedido.nota_produto <= nota_produto_max)

    if preco_min is not None:
        stmt = stmt.where(AvaliacaoPedido.preco >= preco_min)
    if preco_max is not None:
        stmt = stmt.where(AvaliacaoPedido.preco <= preco_max)

    if valor_pedido_min is not None:
        stmt = stmt.where(AvaliacaoPedido.valor_pedido >= valor_pedido_min)
    if valor_pedido_max is not None:
        stmt = stmt.where(AvaliacaoPedido.valor_pedido <= valor_pedido_max)

    if quantidade_min is not None:
        stmt = stmt.where(AvaliacaoPedido.quantidade >= quantidade_min)
    if quantidade_max is not None:
        stmt = stmt.where(AvaliacaoPedido.quantidade <= quantidade_max)

    if nota_nps_min is not None:
        stmt = stmt.where(AvaliacaoPedido.nota_nps >= nota_nps_min)
    if nota_nps_max is not None:
        stmt = stmt.where(AvaliacaoPedido.nota_nps <= nota_nps_max)

    if pct_recomendacoes_sim_min is not None:
        stmt = stmt.where(AvaliacaoPedido.pct_recomendacoes_sim >= pct_recomendacoes_sim_min)
    if pct_recomendacoes_sim_max is not None:
        stmt = stmt.where(AvaliacaoPedido.pct_recomendacoes_sim <= pct_recomendacoes_sim_max)
    
    if data_pedido_start is not None:
        stmt = stmt.where(AvaliacaoPedido.data_pedido >= data_pedido_start)
    if data_pedido_end is not None:
        stmt = stmt.where(AvaliacaoPedido.data_pedido <= data_pedido_end)
    if data_avaliacao_start is not None:
        stmt = stmt.where(AvaliacaoPedido.data_avaliacao >= data_avaliacao_start)
    if data_avaliacao_end is not None:
        stmt = stmt.where(AvaliacaoPedido.data_avaliacao <= data_avaliacao_end)


    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    result = await db.execute(stmt.offset(skip).limit(limit))
    data = result.scalars().all()
    return total, data