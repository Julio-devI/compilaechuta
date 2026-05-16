from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
 
from app.models.problem_satisfaction import SatisfacaoProblema
 
 
class SatisfacaoProblemaFilters:
    def __init__(
        self,
        tipo_problema:                Optional[str]   = None,
        nota_media_min:               Optional[float] = None,
        nota_media_max:               Optional[float] = None,
        tempo_medio_resolucao_max:    Optional[float] = None,
        volume_tickets_min:           Optional[int]   = None,
    ):
        self.tipo_problema             = tipo_problema
        self.nota_media_min            = nota_media_min
        self.nota_media_max            = nota_media_max
        self.tempo_medio_resolucao_max = tempo_medio_resolucao_max
        self.volume_tickets_min        = volume_tickets_min
 
 
def filters_query(query, filters: SatisfacaoProblemaFilters):
    if filters.tipo_problema:
        query = query.where(
            SatisfacaoProblema.tipo_problema.ilike(f"%{filters.tipo_problema}%")
        )
 
    if filters.nota_media_min is not None:
        query = query.where(SatisfacaoProblema.nota_media_satisfacao >= filters.nota_media_min)
 
    if filters.nota_media_max is not None:
        query = query.where(SatisfacaoProblema.nota_media_satisfacao <= filters.nota_media_max)
 
    if filters.tempo_medio_resolucao_max is not None:
        query = query.where(
            SatisfacaoProblema.tempo_medio_resolucao_horas <= filters.tempo_medio_resolucao_max
        )
 
    if filters.volume_tickets_min is not None:
        query = query.where(
            SatisfacaoProblema.volume_tickets >= filters.volume_tickets_min
        )
 
    return query
 
 
async def get_problemas(
    db: AsyncSession,
    filters: SatisfacaoProblemaFilters,
    skip: int = 0,
    limit: int = 100,
) -> tuple[int, list[SatisfacaoProblema]]:
 
    query = select(SatisfacaoProblema)
    query = filters_query(query, filters)
 
    count_subq = query.order_by(None)
    total = (await db.execute(
        select(func.count()).select_from(count_subq.subquery())
    )).scalar_one()
 
    result = await db.execute(query.offset(skip).limit(limit))
    data = result.scalars().all()
 
    return total, data
 
 
async def get_all_problemas_for_export(
    db: AsyncSession,
    filters: SatisfacaoProblemaFilters,
) -> list[SatisfacaoProblema]:
 
    query = select(SatisfacaoProblema)
    query = filters_query(query, filters)
 
    result = await db.execute(query)
    return result.scalars().all()