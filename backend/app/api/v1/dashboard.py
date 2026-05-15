from datetime import date, datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.dashboard import (
    KPIResponse, 
    RevenueOverTimeResponse,
    CSATDistributionResponse,
    OrderStatusDistributionResponse,
    QuickActionsResponse
)
from app.crud import dashboard as crud_dashboard


router = APIRouter()

def _parse_dates(data_inicio: Optional[str], data_fim: Optional[str]) -> tuple[date, date]:
    """
    Converte as strings de data do Query Params para objetos date do Python.
    """
    # NOTA PARA A API: Se o front-end não enviar o filtro de data, 
    # estamos assumindo o padrão de "Últimos 30 dias" para evitar que a query puxe o banco inteiro.
    hoje = date.today()
    try:
        fim = datetime.strptime(data_fim, "%Y-%m-%d").date() if data_fim else hoje
        inicio = datetime.strptime(data_inicio, "%Y-%m-%d").date() if data_inicio else hoje - timedelta(days=30)
        
        if inicio > fim:
            raise ValueError("Data de início não pode ser maior que a data de fim.")
            
        return inicio, fim
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Erro nas datas: {str(e)}. Use o formato YYYY-MM-DD.")

def _get_previous_period(inicio: date, fim: date) -> tuple[date, date]:
    """
    Calcula o período imediatamente anterior com base no intervalo atual.
    Ex: Se filtrou os últimos 7 dias, calcula os 7 dias antes disso para comparação.
    """
    delta = fim - inicio
    days_to_shift = delta.days + 1
    
    fim_anterior = inicio - timedelta(days=1)
    inicio_anterior = inicio - timedelta(days=days_to_shift)
    
    return inicio_anterior, fim_anterior


@router.get("/kpis", response_model=KPIResponse)
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    data_inicio: Optional[str] = Query(None, description="Data de início (YYYY-MM-DD)"),
    data_fim: Optional[str] = Query(None, description="Data de fim (YYYY-MM-DD)"),
    categoria: Optional[str] = Query(None, description="Filtrar por nome da categoria")
):
    inicio, fim = _parse_dates(data_inicio, data_fim)
    inicio_ant, fim_ant = _get_previous_period(inicio, fim)
    
    # NOTA PARA A API: Adicionámos o filtro 'categoria' para refletir a opção "Por Categoria" do layout.
    # O valor será repassado para o CRUD fazer o JOIN quando necessário.
    return await crud_dashboard.get_kpis(
        db=db, 
        data_inicio=inicio, 
        data_fim=fim,
        data_inicio_anterior=inicio_ant,
        data_fim_anterior=fim_ant,
        categoria=categoria 
    )


@router.get("/charts/revenue-over-time", response_model=RevenueOverTimeResponse)
async def get_revenue_over_time(
    db: AsyncSession = Depends(get_db),
    data_inicio: Optional[str] = Query(None, description="Data de início (YYYY-MM-DD)"),
    data_fim: Optional[str] = Query(None, description="Data de fim (YYYY-MM-DD)"),
    categoria: Optional[str] = Query(None, description="Filtrar por nome da categoria") 
):
    inicio, fim = _parse_dates(data_inicio, data_fim)
    
    result = await crud_dashboard.get_revenue_over_time(
        db=db, 
        data_inicio=inicio, 
        data_fim=fim,
        categoria=categoria 
    )
    return {"data": result}


@router.get("/charts/csat-distribution", response_model=CSATDistributionResponse)
async def get_csat_distribution(
    db: AsyncSession = Depends(get_db),
    data_inicio: Optional[str] = Query(None, description="Data de início (YYYY-MM-DD)"),
    data_fim: Optional[str] = Query(None, description="Data de fim (YYYY-MM-DD)"),
    categoria: Optional[str] = Query(None, description="Filtrar por nome da categoria") 
):
    inicio, fim = _parse_dates(data_inicio, data_fim)
    
    result = await crud_dashboard.get_csat_distribution(
        db=db, 
        data_inicio=inicio, 
        data_fim=fim,
        categoria=categoria 
    )
    return {"data": result}


@router.get("/charts/order-status", response_model=OrderStatusDistributionResponse)
async def get_order_status_distribution(
    db: AsyncSession = Depends(get_db),
    data_inicio: Optional[str] = Query(None, description="Data de início (YYYY-MM-DD)"),
    data_fim: Optional[str] = Query(None, description="Data de fim (YYYY-MM-DD)"),
    categoria: Optional[str] = Query(None, description="Filtrar por nome da categoria") 
):
    inicio, fim = _parse_dates(data_inicio, data_fim)
    
    result = await crud_dashboard.get_order_status_distribution(
        db=db, 
        data_inicio=inicio, 
        data_fim=fim,
        categoria=categoria 
    )
    return {"data": result}


@router.get("/quick-actions", response_model=QuickActionsResponse)
async def get_quick_actions(
    db: AsyncSession = Depends(get_db)
):
    # NOTA PARA A API: Ações rápidas geralmente olham pro estado "agora" do banco,
    # por isso não passei os filtros de data nem de categoria aqui. Se a regra de negócio for ver 
    # "tickets abertos APENAS de pedidos desta categoria", precisará de adicionar os filtros.
    return await crud_dashboard.get_quick_actions(db=db)