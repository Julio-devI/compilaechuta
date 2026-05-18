from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
 
from app.models.satisfaction_agents import AgenteSatisfacao
 
 
class AgenteSatisfacaoFilters:
    def __init__(
        self,
        agente_suporte:               Optional[str]   = None,
        nota_media_min:               Optional[float] = None,
        nota_media_max:               Optional[float] = None,
        tempo_medio_resolucao_max:    Optional[float] = None,
        qtd_tickets_resolvidos_min:   Optional[int]   = None,
    ):
        self.agente_suporte             = agente_suporte
        self.nota_media_min             = nota_media_min
        self.nota_media_max             = nota_media_max
        self.tempo_medio_resolucao_max  = tempo_medio_resolucao_max
        self.qtd_tickets_resolvidos_min = qtd_tickets_resolvidos_min
 
 
def filters_query(query, filters: AgenteSatisfacaoFilters):
    if filters.agente_suporte:
        query = query.where(
            AgenteSatisfacao.agente_suporte.ilike(f"%{filters.agente_suporte}%")
        )
 
    if filters.nota_media_min is not None:
        query = query.where(AgenteSatisfacao.nota_media_satisfacao >= filters.nota_media_min)
 
    if filters.nota_media_max is not None:
        query = query.where(AgenteSatisfacao.nota_media_satisfacao <= filters.nota_media_max)
 
    if filters.tempo_medio_resolucao_max is not None:
        query = query.where(
            AgenteSatisfacao.tempo_medio_resolucao <= filters.tempo_medio_resolucao_max
        )
 
    if filters.qtd_tickets_resolvidos_min is not None:
        query = query.where(
            AgenteSatisfacao.qtd_tickets_resolvidos >= filters.qtd_tickets_resolvidos_min
        )
 
    return query
 
 
async def get_agentes(
    db: AsyncSession,
    filters: AgenteSatisfacaoFilters,
    skip: int = 0,
    limit: int = 100,
) -> tuple[int, list[AgenteSatisfacao]]:
 
    query = select(AgenteSatisfacao)
    query = filters_query(query, filters)
 
    count_subq = query.order_by(None)
    total = (await db.execute(
        select(func.count()).select_from(count_subq.subquery())
    )).scalar_one()
 
    result = await db.execute(query.offset(skip).limit(limit))
    data = result.scalars().all()
 
    return total, data
 
 
async def get_all_agentes_for_export(
    db: AsyncSession,
    filters: AgenteSatisfacaoFilters,
) -> list[AgenteSatisfacao]:
 
    query = select(AgenteSatisfacao)
    query = filters_query(query, filters)
 
    result = await db.execute(query)
    return result.scalars().all()