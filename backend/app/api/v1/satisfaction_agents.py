from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.deps import get_db
from app.services import satisfaction_agents as service
from app.crud.satisfaction_agents import AgenteSatisfacaoFilters
from app.schemas.satisfaction_agents import AgenteSatisfacaoListOut


class AgenteSatisfacaoQueryFilters:
    def __init__(
        self,
        agente_suporte: Optional[str] = Query(
            None, description="Filtrar por nome do agente de suporte"
        ),
        nota_media_min: Optional[float] = Query(
            None, ge=0, le=5, description="Nota média de satisfação mínima (0–5)"
        ),
        nota_media_max: Optional[float] = Query(
            None, ge=0, le=5, description="Nota média de satisfação máxima (0–5)"
        ),
        tempo_medio_resolucao_max: Optional[float] = Query(
            None, ge=0, description="Tempo médio de resolução máximo (em horas)"
        ),
        qtd_tickets_resolvidos_min: Optional[int] = Query(
            None, ge=0, description="Quantidade mínima de tickets resolvidos"
        ),
    ):
        self.agente_suporte             = agente_suporte
        self.nota_media_min             = nota_media_min
        self.nota_media_max             = nota_media_max
        self.tempo_medio_resolucao_max  = tempo_medio_resolucao_max
        self.qtd_tickets_resolvidos_min = qtd_tickets_resolvidos_min


def build_filters(q: AgenteSatisfacaoQueryFilters) -> AgenteSatisfacaoFilters:
    return AgenteSatisfacaoFilters(
        agente_suporte=q.agente_suporte,
        nota_media_min=q.nota_media_min,
        nota_media_max=q.nota_media_max,
        tempo_medio_resolucao_max=q.tempo_medio_resolucao_max,
        qtd_tickets_resolvidos_min=q.qtd_tickets_resolvidos_min,
    )


router = APIRouter()


@router.get("/", response_model=AgenteSatisfacaoListOut)
async def listar(
    db: AsyncSession = Depends(get_db),
    q: AgenteSatisfacaoQueryFilters = Depends(),
    skip:  int = Query(0,   ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await service.listar_agentes(
        db=db,
        filters=build_filters(q),
        skip=skip,
        limit=limit,
    )


@router.get("/exportar")
async def exportar(
    db: AsyncSession = Depends(get_db),
    q: AgenteSatisfacaoQueryFilters = Depends(),
):
    output = await service.exportar_agentes_csv(
        db=db,
        filters=build_filters(q),
    )

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=satisfacao_agentes.csv"},
    )