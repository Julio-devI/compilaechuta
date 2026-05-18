from typing import List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.time import Tempo

async def get_time_by_id(db: AsyncSession, id_data: int) -> Optional[Tempo]:
    stmt = select(Tempo).where(Tempo.id_data == id_data)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def get_all_time(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 100,
    ano: Optional[int] = None,
    mes: Optional[int] = None,
    dia: Optional[int] = None,
    trimestre: Optional[int] = None,
    dia_semana_num: Optional[int] = None,
    dia_do_ano: Optional[int] = None,
    semana_do_ano: Optional[int] = None,
    nome_mes: Optional[str] = None,
    nome_dia_semana: Optional[str] = None,
    ano_mes: Optional[str] = None,
    trimestre_label: Optional[str] = None,
    fim_de_semana: Optional[bool] = None
) -> Tuple[int, List[Tempo]]:
    stmt = select(Tempo)

    if ano is not None:
        stmt = stmt.where(Tempo.ano == ano)
    if mes is not None:
        stmt = stmt.where(Tempo.mes == mes)
    if dia is not None:
        stmt = stmt.where(Tempo.dia == dia)
    if trimestre is not None:
        stmt = stmt.where(Tempo.trimestre == trimestre)
    if dia_semana_num is not None:
        stmt = stmt.where(Tempo.dia_semana_num == dia_semana_num)
    if dia_do_ano is not None:
        stmt = stmt.where(Tempo.dia_do_ano == dia_do_ano)
    if semana_do_ano is not None:
        stmt = stmt.where(Tempo.semana_do_ano == semana_do_ano)
    if nome_mes is not None:
        stmt = stmt.where(Tempo.nome_mes.ilike(f"%{nome_mes}%"))
    if nome_dia_semana is not None:
        stmt = stmt.where(Tempo.nome_dia_semana.ilike(f"%{nome_dia_semana}%"))
    if ano_mes is not None:
        stmt = stmt.where(Tempo.ano_mes.ilike(f"%{ano_mes}%"))
    if trimestre_label is not None:
        stmt = stmt.where(Tempo.trimestre_label.ilike(f"%{trimestre_label}%"))
    if fim_de_semana is not None:
        stmt = stmt.where(Tempo.fim_de_semana == fim_de_semana)

    
    count_stmt = stmt.with_only_columns(func.count(Tempo.id_data)).order_by(None)
    total_count = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Tempo.id_data) 
    result = await db.execute(stmt.offset(skip).limit(limit))
    return total_count, list(result.scalars().all())