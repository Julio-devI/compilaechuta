from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.dashboard import KPIResponse, ChartRevenueOverTime, ChartRevenueByCategory
from app.crud import dashboard as crud_dashboard


router = APIRouter()


@router.get("/kpis", response_model=KPIResponse)
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    data_inicio: Optional[str] = Query(None, description="Data de início para o filtro (YYYY-MM-DD)"),
    data_fim: Optional[str] = Query(None, description="Data de fim para o filtro (YYYY-MM-DD)"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoria de produto")
):
    return await crud_dashboard.get_kpis(
        db=db, 
        data_inicio=data_inicio, 
        data_fim=data_fim, 
        categoria=categoria
    )


@router.get("/charts/revenue-over-time", response_model=list[ChartRevenueOverTime])
async def get_revenue_over_time(
    db: AsyncSession = Depends(get_db),
    data_inicio: Optional[str] = Query(None, description="Data de início para o filtro (YYYY-MM-DD)"),
    data_fim: Optional[str] = Query(None, description="Data de fim para o filtro (YYYY-MM-DD)"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoria de produto")
):
    return await crud_dashboard.get_revenue_over_time(
        db=db, 
        data_inicio=data_inicio, 
        data_fim=data_fim, 
        categoria=categoria
    )


@router.get("/charts/revenue-by-category", response_model=list[ChartRevenueByCategory])
async def get_revenue_by_category(
    db: AsyncSession = Depends(get_db),
    data_inicio: Optional[str] = Query(None, description="Data de início para o filtro (YYYY-MM-DD)"),
    data_fim: Optional[str] = Query(None, description="Data de fim para o filtro (YYYY-MM-DD)"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoria de produto")
):
    return await crud_dashboard.get_revenue_by_category(
        db=db, 
        data_inicio=data_inicio, 
        data_fim=data_fim, 
        categoria=categoria
    )