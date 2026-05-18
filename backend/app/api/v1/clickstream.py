from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.api.deps import get_db
from app.crud import clickstream as crud_click
from app.schemas.clickstream import ClickstreamResponse, ClickstreamListResponse

router = APIRouter()

@router.get("/", response_model=ClickstreamListResponse)
async def read_clickstreams(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    id_cliente: Optional[str] = Query(None),
    total_sessoes_min: Optional[int] = Query(None, ge=0),
    total_sessoes_max: Optional[int] = Query(None, ge=0),
    total_eventos_min: Optional[int] = Query(None, ge=0),
    total_eventos_max: Optional[int] = Query(None, ge=0),
    data_ultima_sessao_start: Optional[datetime] = Query(None, description="ISO date start for data_ultima_sessao"),
    data_ultima_sessao_end: Optional[datetime] = Query(None, description="ISO date end for data_ultima_sessao"),
    qtd_visualizacao_produto_min: Optional[int] = Query(None, ge=0),
    qtd_visualizacao_produto_max: Optional[int] = Query(None, ge=0),
    qtd_adicoes_carrinho_min: Optional[int] = Query(None, ge=0),
    qtd_adicoes_carrinho_max: Optional[int] = Query(None, ge=0),
    qtd_abandonos_carrinho_min: Optional[int] = Query(None, ge=0),
    qtd_abandonos_carrinho_max: Optional[int] = Query(None, ge=0),
    qtd_compras_min: Optional[int] = Query(None, ge=0),
    qtd_compras_max: Optional[int] = Query(None, ge=0),
    canal_mais_usado: Optional[str] = Query(None),
    dispositivo_mais_usado: Optional[str] = Query(None),
):
    total, data = await crud_click.get_all_clickstreams(
        db=db,
        skip=skip,
        limit=limit,
        id_cliente=id_cliente,
        total_sessoes_min=total_sessoes_min,
        total_sessoes_max=total_sessoes_max,
        total_eventos_min=total_eventos_min,
        total_eventos_max=total_eventos_max,
        data_ultima_sessao_start=data_ultima_sessao_start,
        data_ultima_sessao_end=data_ultima_sessao_end,
        qtd_visualizacao_produto_min=qtd_visualizacao_produto_min,
        qtd_visualizacao_produto_max=qtd_visualizacao_produto_max,
        qtd_adicoes_carrinho_min=qtd_adicoes_carrinho_min,
        qtd_adicoes_carrinho_max=qtd_adicoes_carrinho_max,
        qtd_abandonos_carrinho_min=qtd_abandonos_carrinho_min,
        qtd_abandonos_carrinho_max=qtd_abandonos_carrinho_max,
        qtd_compras_min=qtd_compras_min,
        qtd_compras_max=qtd_compras_max,
        canal_mais_usado=canal_mais_usado,
        dispositivo_mais_usado=dispositivo_mais_usado,
    )
    return ClickstreamListResponse(total=total, skip=skip, limit=limit, data=[ClickstreamResponse.from_orm(item) for item in data])

@router.get("/{id_cliente}", response_model=ClickstreamResponse)
async def read_clickstream_by_cliente_id(
    id_cliente: str,
    db: AsyncSession = Depends(get_db)
):
    clickstream = await crud_click.get_clickstream_by_cliente_id(db, id_cliente)
    if not clickstream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clickstream not found")
    return ClickstreamResponse.from_orm(clickstream)