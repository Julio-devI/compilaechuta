from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.models.pedido import Pedido


def _apply_filters(stmt, model, data_inicio=None, data_fim=None, categoria=None):
    if data_inicio:
        stmt = stmt.filter(model.data_pedido >= data_inicio)
    if data_fim:
        stmt = stmt.filter(model.data_pedido <= data_fim)
    if categoria:
        stmt = stmt.filter(model.categoria == categoria)
    return stmt


async def get_kpis(db: AsyncSession, data_inicio=None, data_fim=None, categoria=None):
    stmt = select(
        func.sum(Pedido.valor_pedido).label("total_revenue"),
        func.count(Pedido.id_pedido).label("total_orders")
    )
    
    stmt = _apply_filters(stmt, Pedido, data_inicio, data_fim, categoria)
    result = await db.execute(stmt)
    row = result.first()
    
    total_revenue = row.total_revenue or 0.0 if row else 0.0
    total_orders = row.total_orders or 0 if row else 0
    average_ticket = (total_revenue / total_orders) if total_orders > 0 else 0.0
    
    return {
        "total_revenue": float(total_revenue),
        "total_orders": int(total_orders),
        "average_ticket": float(average_ticket)
    }


async def get_revenue_over_time(db: AsyncSession, data_inicio=None, data_fim=None, categoria=None):
    time_period = func.strftime('%Y-%m', Pedido.data_pedido).label('time_period')
    stmt = select(
        time_period,
        func.sum(Pedido.valor_pedido).label("revenue")
    )
    
    stmt = _apply_filters(stmt, Pedido, data_inicio, data_fim, categoria)
    stmt = stmt.group_by(time_period).order_by(time_period.asc())
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {"time_period": row.time_period, "revenue": float(row.revenue or 0.0)}
        for row in rows
    ]


async def get_revenue_by_category(db: AsyncSession, data_inicio=None, data_fim=None):
    stmt = select(
        Pedido.categoria.label("category"),
        func.sum(Pedido.valor_pedido).label("revenue")
    )
    
    stmt = _apply_filters(stmt, Pedido, data_inicio, data_fim, None)
    stmt = stmt.group_by(Pedido.categoria).order_by(func.sum(Pedido.valor_pedido).desc())
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {"category": row.category, "revenue": float(row.revenue or 0.0)}
        for row in rows
    ]