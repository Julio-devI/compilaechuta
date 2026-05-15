from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, case
from datetime import date
from typing import Optional, List, Dict, Any

from app.models.orders import Pedido
from app.models.tickets import Ticket
from app.models.products import Produto  # ADICIONADO: Necessário para o JOIN do filtro de categoria
# NOTA PARA O CRUD: Descomente a importação abaixo quando criar a model para a fato_avaliacoes_pedido
# from app.models.reviews import Avaliacao 


def _calculate_percentage_change(current: float, previous: float) -> float:
    """Calcula a variação percentual entre dois períodos."""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 2)


def _apply_filters(stmt, column_date, data_inicio: Optional[date] = None, data_fim: Optional[date] = None):
    """
    Aplica filtros de data dinamicamente.
    NOTA PARA O CRUD: Lembre-se que id_data na model Pedido precisa ser do tipo Date.
    """
    if data_inicio:
        stmt = stmt.filter(column_date >= data_inicio)
    if data_fim:
        stmt = stmt.filter(column_date <= data_fim)
    return stmt


def _apply_category_filter(stmt, categoria: Optional[str] = None, is_review: bool = False):
    """
    Aplica o filtro de categoria dinamicamente.
    NOTA PARA O CRUD: Na model Pedido (fato_vendas) fazemos JOIN com Produto, pois Pedido só tem id_produto. 
    Na model Avaliacao (fato_avaliacoes_pedido), de acordo com o seu schema original, 
    já existe a coluna 'categoria' nativa, então filtramos diretamente.
    """
    if categoria:
        if is_review:
            stmt = stmt.filter(Avaliacao.categoria == categoria)
        else:
            stmt = stmt.join(Produto, Pedido.id_produto == Produto.id_produto)
            stmt = stmt.filter(Produto.categoria == categoria)
    return stmt


async def get_kpis(
    db: AsyncSession, 
    data_inicio: date, 
    data_fim: date, 
    data_inicio_anterior: date, 
    data_fim_anterior: date,
    categoria: Optional[str] = None  # ADICIONADO: Parâmetro de categoria
):
    """
    Busca os indicadores principais, calculando o período atual e o anterior 
    para gerar a variação (Time Intelligence) com dados reais.
    """
    # 1. Receita, Pedidos e Clientes Ativos (Período Atual)
    stmt_atual = select(
        func.sum(Pedido.valor_total_venda).label("total_revenue"),
        func.count(Pedido.id_pedido).label("total_orders"),
        func.count(func.distinct(Pedido.id_cliente)).label("active_clients")
    )
    stmt_atual = _apply_filters(stmt_atual, Pedido.id_data, data_inicio, data_fim)
    stmt_atual = _apply_category_filter(stmt_atual, categoria, is_review=False)
    result_atual = await db.execute(stmt_atual)
    row_atual = result_atual.first()
    
    current_revenue = float(row_atual.total_revenue or 0.0) if row_atual else 0.0
    current_orders = int(row_atual.total_orders or 0) if row_atual else 0
    current_active = int(row_atual.active_clients or 0) if row_atual else 0

    # 2. Receita, Pedidos e Clientes Ativos (Período Anterior)
    stmt_ant = select(
        func.sum(Pedido.valor_total_venda).label("total_revenue"),
        func.count(Pedido.id_pedido).label("total_orders"),
        func.count(func.distinct(Pedido.id_cliente)).label("active_clients")
    )
    stmt_ant = _apply_filters(stmt_ant, Pedido.id_data, data_inicio_anterior, data_fim_anterior)
    stmt_ant = _apply_category_filter(stmt_ant, categoria, is_review=False)
    result_ant = await db.execute(stmt_ant)
    row_ant = result_ant.first()
    
    prev_revenue = float(row_ant.total_revenue or 0.0) if row_ant else 0.0
    prev_orders = int(row_ant.total_orders or 0) if row_ant else 0
    prev_active = int(row_ant.active_clients or 0) if row_ant else 0

    # 3. CSAT Promotores (Período Atual)
    # NOTA PARA O CRUD: Requer a model Avaliacao mapeada.
    stmt_csat_atual = select(
        func.count(case((Avaliacao.categoria_nps == 'Promotor', 1))).label("promoters"),
        func.count(Avaliacao.id_avaliacao).label("total")
    )
    stmt_csat_atual = _apply_filters(stmt_csat_atual, Avaliacao.data_avaliacao, data_inicio, data_fim)
    stmt_csat_atual = _apply_category_filter(stmt_csat_atual, categoria, is_review=True)
    res_csat_atual = await db.execute(stmt_csat_atual)
    row_csat_atual = res_csat_atual.first()
    
    curr_promoters = row_csat_atual.promoters or 0 if row_csat_atual else 0
    curr_total_evals = row_csat_atual.total or 0 if row_csat_atual else 0
    current_csat = (curr_promoters / curr_total_evals * 100) if curr_total_evals > 0 else 0.0

    # 4. CSAT Promotores (Período Anterior)
    stmt_csat_ant = select(
        func.count(case((Avaliacao.categoria_nps == 'Promotor', 1))).label("promoters"),
        func.count(Avaliacao.id_avaliacao).label("total")
    )
    stmt_csat_ant = _apply_filters(stmt_csat_ant, Avaliacao.data_avaliacao, data_inicio_anterior, data_fim_anterior)
    stmt_csat_ant = _apply_category_filter(stmt_csat_ant, categoria, is_review=True)
    res_csat_ant = await db.execute(stmt_csat_ant)
    row_csat_ant = res_csat_ant.first()

    prev_promoters = row_csat_ant.promoters or 0 if row_csat_ant else 0
    prev_total_evals = row_csat_ant.total or 0 if row_csat_ant else 0
    prev_csat = (prev_promoters / prev_total_evals * 100) if prev_total_evals > 0 else 0.0

    return {
        "total_revenue": {
            "current_value": current_revenue,
            "percentage_change": _calculate_percentage_change(current_revenue, prev_revenue)
        },
        "total_orders": {
            "current_value": current_orders,
            "percentage_change": _calculate_percentage_change(current_orders, prev_orders)
        },
        "csat_promoters": {
            "current_value": round(current_csat, 2),
            "percentage_change": _calculate_percentage_change(current_csat, prev_csat)
        },
        "active_clients": {
            "current_value": current_active,
            "percentage_change": _calculate_percentage_change(current_active, prev_active)
        }
    }


async def get_revenue_over_time(
    db: AsyncSession, 
    data_inicio: date, 
    data_fim: date,
    categoria: Optional[str] = None  
):
    """
    Gráfico: Média de Receita por Mês (Tendências).
    """
    # NOTA PARA O CRUD: strftime é para SQLite. Se usar Postgres, altere para func.to_char(Pedido.id_data, 'YYYY-MM')
    time_period = func.strftime('%Y-%m', Pedido.id_data).label('time_period')
    
    stmt = select(
        time_period,
        func.sum(Pedido.valor_total_venda).label("revenue")
    )
    stmt = _apply_filters(stmt, Pedido.id_data, data_inicio, data_fim)
    stmt = _apply_category_filter(stmt, categoria, is_review=False)
    stmt = stmt.group_by(time_period).order_by(time_period.asc())
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {"time_period": row.time_period, "revenue": float(row.revenue or 0.0)}
        for row in rows
    ]


async def get_csat_distribution(
    db: AsyncSession, 
    data_inicio: date, 
    data_fim: date,
    categoria: Optional[str] = None 
):
    """
    Gráfico: Taxa de Satisfação (Progresso Colorido).
    Calcula as porcentagens exatas de cada categoria com base nas avaliações do período.
    """
    # NOTA PARA O CRUD: Requer a model Avaliacao mapeada.
    stmt = select(
        func.count(case((Avaliacao.categoria_nps == 'Promotor', 1))).label("promoters"),
        func.count(case((Avaliacao.categoria_nps == 'Neutro', 1))).label("neutrals"),
        func.count(case((Avaliacao.categoria_nps == 'Detrator', 1))).label("detractors"),
        func.count(Avaliacao.id_avaliacao).label("total")
    )
    stmt = _apply_filters(stmt, Avaliacao.data_avaliacao, data_inicio, data_fim)
    stmt = _apply_category_filter(stmt, categoria, is_review=True)
    
    result = await db.execute(stmt)
    row = result.first()
    
    total = row.total or 0 if row else 0
    
    if total == 0:
        return {"promoters_pct": 0.0, "neutrals_pct": 0.0, "detractors_pct": 0.0}

    return {
        "promoters_pct": round((row.promoters / total) * 100, 2),
        "neutrals_pct": round((row.neutrals / total) * 100, 2),
        "detractors_pct": round((row.detractors / total) * 100, 2)
    }


async def get_order_status_distribution(
    db: AsyncSession, 
    data_inicio: date, 
    data_fim: date,
    categoria: Optional[str] = None  
):
    stmt = select(
        Pedido.status,
        func.count(Pedido.id_pedido).label("count")
    )
    stmt = _apply_filters(stmt, Pedido.id_data, data_inicio, data_fim)
    stmt = _apply_category_filter(stmt, categoria, is_review=False)
    stmt = stmt.filter(Pedido.status.is_not(None)).group_by(Pedido.status)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {"status": row.status, "count": int(row.count)}
        for row in rows
    ]


async def get_quick_actions(db: AsyncSession):
    stmt = select(func.count(func.distinct(Ticket.id_cliente)).label("clients_with_open_tickets"))
    # NOTA PARA O CRUD: Certifique-se de que a string de status bate com o que está no banco.
    stmt = stmt.filter(Ticket.status == "Aberto") 
    
    result = await db.execute(stmt)
    row = result.first()
    
    return {
        "clients_with_open_tickets": int(row.clients_with_open_tickets or 0)
    }