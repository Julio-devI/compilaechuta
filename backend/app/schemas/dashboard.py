from pydantic import BaseModel, Field
from typing import List, Optional

class KPIVariation(BaseModel):

    current_value: float = Field(..., description="Valor atual no período filtrado")
    percentage_change: Optional[float] = Field(None, description="Variação percentual. None quando não há dados no período anterior.")
    # NOTA PARA O CRUD: Para calcular a variação, a entidade `Pedido` precisa
    # ter a coluna `id_data` convertida para `Date` (atualmente está como `String`),
    # permitindo filtros de datas dinâmicos no SQLAlchemy.


class KPIResponse(BaseModel):

    total_revenue: KPIVariation = Field(..., description="Receita total (soma de valor_total_venda)")
    total_orders: KPIVariation = Field(..., description="Quantidade total de pedidos")
    csat_promoters: KPIVariation = Field(..., description="Percentual de CSAT Promotores")
    active_clients: KPIVariation = Field(..., description="Quantidade de clientes distintos que realizaram ação")
    ltv_medio: KPIVariation = Field(..., description="Média de lifetime value (total_gasto_brl) dos clientes")

class ChartRevenueOverTime(BaseModel):
    time_period: str = Field(..., description='Rótulo do eixo X (ex: "Jan", "Fev" ou "2026-01-15")')
    revenue: float = Field(..., description="Valor consolidado no período para as barras do gráfico")


class RevenueOverTimeResponse(BaseModel):
    data: List[ChartRevenueOverTime] = Field(
        default_factory=list, 
        description="Lista de dados da receita ao longo do tempo (Tendências)"
    )


class ChartCSATDistribution(BaseModel):
    promoters_pct: float = Field(..., description="Porcentagem de Promotores (ex: 70.0)")
    neutrals_pct: float = Field(..., description="Porcentagem de Neutros (ex: 18.0)")
    detractors_pct: float = Field(..., description="Porcentagem de Detratores (ex: 12.0)")


class CSATDistributionResponse(BaseModel):
    data: ChartCSATDistribution = Field(
        ..., 
        description="Distribuição da taxa de satisfação para a barra de progresso colorida"
    )
    # NOTA PARA O CRUD: Novamente, depende da criação da model da `fato_avaliacoes_pedido`.


class ChartOrderStatus(BaseModel):
    status: str = Field(..., description='Status do pedido (ex: "Comprados", "Em Processamento", "Enviados")')
    count: int = Field(..., description="Contagem de pedidos neste status")


class OrderStatusDistributionResponse(BaseModel):
    data: List[ChartOrderStatus] = Field(
        default_factory=list,
        description="Distribuição de pedidos por status (gráfico de barras horizontais verdes)"
    )
    # NOTA PARA O CRUD: O agrupamento aqui será feito pela coluna `status` da entidade `Pedido`.

class QuickActionsResponse(BaseModel):
    clients_with_open_tickets: int = Field(..., description="Total de clientes com tickets em aberto")
    # NOTA PARA O CRUD: A model `Ticket` já existe e tem a coluna `status`. Basta filtrar 
    # Ticket.status == 'aberto' (ou o equivalente) e contar as ocorrências.
    
    # OBS: "Pedidos atrasados" foi removido conforme sua solicitação anterior de retirar 
    # a logística de entrega.

class ChartRevenueByCategory(BaseModel):
    category: str = Field(..., description="Nome da categoria do produto")
    revenue: float = Field(..., description="Valor consolidado na categoria")

class RevenueByCategoryResponse(BaseModel):
    data: List[ChartRevenueByCategory] = Field(default_factory=list)


class ChartClientByRegion(BaseModel):
    regiao: str
    clientes: int

class ClientsByRegionResponse(BaseModel):
    data: List[ChartClientByRegion] = Field(default_factory=list)


class ChartOrderByWeekday(BaseModel):
    dia: str
    pedidos: int

class OrdersByWeekdayResponse(BaseModel):
    data: List[ChartOrderByWeekday] = Field(default_factory=list)