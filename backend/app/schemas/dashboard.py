from pydantic import BaseModel, Field
from typing import List

class KPIResponse(BaseModel):
    total_revenue: float = Field(..., description="Receita total (soma de valor_pedido)")
    total_orders: int = Field(..., description="Quantidade total de pedidos")
    average_ticket: float = Field(..., description="Ticket médio")


class ChartRevenueOverTime(BaseModel):
    time_period: str = Field(..., description='Período de tempo consolidado (ex: dia "2026-01-15", mês "2026-01", ano "2026", trimestre "2026-Q1", etc.)')
    revenue: float = Field(..., description="Valor consolidado no período")


class ChartRevenueByCategory(BaseModel):
    category: str = Field(..., description="Nome da categoria do produto")
    revenue: float = Field(..., description="Valor consolidado na categoria")


class RevenueOverTimeResponse(BaseModel):
    data: List[ChartRevenueOverTime] = Field(
        default_factory=list, 
        description="Lista de dados da receita sobre o tempo"
    )


class RevenueByCategoryResponse(BaseModel):
    data: List[ChartRevenueByCategory] = Field(
        default_factory=list, 
        description="Lista de faturamento agregado por categoria"
    )