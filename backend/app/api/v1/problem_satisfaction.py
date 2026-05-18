from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
 
from app.api.deps import get_db
from app.services import problem_satisfaction as service
from app.crud.problem_satisfaction import SatisfacaoProblemaFilters
from app.schemas.problem_satisfaction import SatisfacaoProblemaListOut
 
 
class SatisfacaoProblemaQueryFilters:
    def __init__(
        self,
        tipo_problema: Optional[str] = Query(
            None, description="Filtrar por tipo de problema"
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
        volume_tickets_min: Optional[int] = Query(
            None, ge=0, description="Volume mínimo de tickets"
        ),
    ):
        self.tipo_problema             = tipo_problema
        self.nota_media_min            = nota_media_min
        self.nota_media_max            = nota_media_max
        self.tempo_medio_resolucao_max = tempo_medio_resolucao_max
        self.volume_tickets_min        = volume_tickets_min
 
 
def build_filters(q: SatisfacaoProblemaQueryFilters) -> SatisfacaoProblemaFilters:
    return SatisfacaoProblemaFilters(
        tipo_problema=q.tipo_problema,
        nota_media_min=q.nota_media_min,
        nota_media_max=q.nota_media_max,
        tempo_medio_resolucao_max=q.tempo_medio_resolucao_max,
        volume_tickets_min=q.volume_tickets_min,
    )
 
 
router = APIRouter()
 
 
@router.get("/", response_model=SatisfacaoProblemaListOut)
async def listar(
    db: AsyncSession = Depends(get_db),
    q: SatisfacaoProblemaQueryFilters = Depends(),
    skip:  int = Query(0,   ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await service.listar_problemas(
        db=db,
        filters=build_filters(q),
        skip=skip,
        limit=limit,
    )
 
 
@router.get("/exportar")
async def exportar(
    db: AsyncSession = Depends(get_db),
    q: SatisfacaoProblemaQueryFilters = Depends(),
):
    output = await service.exportar_problemas_csv(
        db=db,
        filters=build_filters(q),
    )
 
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=satisfacao_problemas.csv"},
    )