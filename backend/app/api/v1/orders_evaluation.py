from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.api.deps import get_db
from app.crud import orders_evaluation as crud_eval
from app.schemas.orders_evaluation import AvaliacaoPedidoOut, AvaliacaoPedidoListOut

router = APIRouter()

@router.get("/", response_model=AvaliacaoPedidoListOut)
async def read_evaluations(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    id_pedido: Optional[str] = Query(None),
    id_produto: Optional[str] = Query(None),
    id_cliente: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    metodo_pagamento: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    categoria_nps: Optional[str] = Query(None),
    recomenda: Optional[bool] = Query(None),
    nota_produto_min: Optional[float] = Query(None),
    nota_produto_max: Optional[float] = Query(None),
    preco_min: Optional[float] = Query(None),
    preco_max: Optional[float] = Query(None),
    valor_pedido_min: Optional[float] = Query(None),
    valor_pedido_max: Optional[float] = Query(None),
    quantidade_min: Optional[float] = Query(None),
    quantidade_max: Optional[float] = Query(None),
    nota_nps_min: Optional[float] = Query(None),
    nota_nps_max: Optional[float] = Query(None),
    pct_recomendacoes_sim_min: Optional[float] = Query(None),
    pct_recomendacoes_sim_max: Optional[float] = Query(None),
    data_pedido_start: Optional[datetime] = Query(None, description="ISO date start for data_pedido"),
    data_pedido_end: Optional[datetime] = Query(None, description="ISO date end for data_pedido"),
    data_avaliacao_start: Optional[datetime] = Query(None, description="ISO date start for data_avaliacao"),
    data_avaliacao_end: Optional[datetime] = Query(None, description="ISO date end for data_avaliacao"),
):
    total, data = await crud_eval.get_all_evaluations(
        db=db,
        skip=skip,
        limit=limit,
        id_pedido=id_pedido,
        id_produto=id_produto,
        id_cliente=id_cliente,
        categoria=categoria,
        metodo_pagamento=metodo_pagamento,
        status=status,
        categoria_nps=categoria_nps,
        recomenda=recomenda,
        nota_produto_min=nota_produto_min,
        nota_produto_max=nota_produto_max,
        preco_min=preco_min,
        preco_max=preco_max,
        valor_pedido_min=valor_pedido_min,
        valor_pedido_max=valor_pedido_max,
        quantidade_min=quantidade_min,
        quantidade_max=quantidade_max,
        nota_nps_min=nota_nps_min,
        nota_nps_max=nota_nps_max,
        pct_recomendacoes_sim_min=pct_recomendacoes_sim_min,
        pct_recomendacoes_sim_max=pct_recomendacoes_sim_max,
        data_pedido_start=data_pedido_start,
        data_pedido_end=data_pedido_end,
        data_avaliacao_start=data_avaliacao_start,
        data_avaliacao_end=data_avaliacao_end,
    )
    return AvaliacaoPedidoListOut(total=total, skip=skip, limit=limit, data=[AvaliacaoPedidoOut.from_orm(item) for item in data])

@router.get("/product/{id_produto}/comments", response_model=List[str])
async def get_product_comments(id_produto: str, limit: int = Query(5, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    comments = await crud_eval.get_evaluations_by_product_id(db=db, id_produto=id_produto, limit=limit)
    return comments

@router.get("/{id_avaliacao}", response_model=AvaliacaoPedidoOut)
async def read_evaluation(
    id_avaliacao: str,
    db: AsyncSession = Depends(get_db)
):
    order_evaluation = await crud_eval.get_evaluation_by_id(db=db, id_avaliacao=id_avaliacao)
    if not order_evaluation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avaliação não encontrada")
    return AvaliacaoPedidoOut.from_orm(order_evaluation)