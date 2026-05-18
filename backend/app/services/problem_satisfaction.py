import csv
import io
from typing import Optional
 
from sqlalchemy.ext.asyncio import AsyncSession
 
from app.crud import problem_satisfaction as crud
from app.crud.problem_satisfaction import SatisfacaoProblemaFilters
from app.schemas.problem_satisfaction import SatisfacaoProblemaListOut
 
 
async def listar_problemas(
    db: AsyncSession,
    filters: SatisfacaoProblemaFilters,
    skip: int = 0,
    limit: int = 100,
) -> SatisfacaoProblemaListOut:
    total, data = await crud.get_problemas(
        db=db,
        filters=filters,
        skip=skip,
        limit=limit,
    )
    return SatisfacaoProblemaListOut(total=total, skip=skip, limit=limit, data=data)
 
 
async def exportar_problemas_csv(
    db: AsyncSession,
    filters: SatisfacaoProblemaFilters,
) -> io.StringIO:
 
    problemas = await crud.get_all_problemas_for_export(
        db=db,
        filters=filters,
    )
 
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "tipo_problema",
        "volume_tickets",
        "nota_media_satisfacao",
        "tempo_medio_resolucao_horas",
    ])
    for problema in problemas:
        writer.writerow([
            problema.tipo_problema,
            problema.volume_tickets,
            problema.nota_media_satisfacao,
            problema.tempo_medio_resolucao_horas,
        ])
    output.seek(0)
    return output