import csv
import io
from typing import Optional
 
from sqlalchemy.ext.asyncio import AsyncSession
 
from app.crud import satisfaction_agents as crud
from app.crud.satisfaction_agents import AgenteSatisfacaoFilters
from app.schemas.satisfaction_agents import AgenteSatisfacaoListOut
 
 
async def listar_agentes(
    db: AsyncSession,
    filters: AgenteSatisfacaoFilters,
    skip: int = 0,
    limit: int = 100,
) -> AgenteSatisfacaoListOut:
    total, data = await crud.get_agentes(
        db=db,
        filters=filters,
        skip=skip,
        limit=limit,
    )
    return AgenteSatisfacaoListOut(total=total, skip=skip, limit=limit, data=data)
 
 
async def exportar_agentes_csv(
    db: AsyncSession,
    filters: AgenteSatisfacaoFilters,
) -> io.StringIO:
 
    agentes = await crud.get_all_agentes_for_export(
        db=db,
        filters=filters,
    )
 
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "agente_suporte",
        "qtd_tickets_resolvidos",
        "nota_media_satisfacao",
        "tempo_medio_resolucao",
    ])
    for agente in agentes:
        writer.writerow([
            agente.agente_suporte,
            agente.qtd_tickets_resolvidos,
            agente.nota_media_satisfacao,
            agente.tempo_medio_resolucao,
        ])
    output.seek(0)
    return output