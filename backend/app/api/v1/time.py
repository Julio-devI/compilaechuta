from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.api.deps import get_db
from app.crud import time as crud_time
from app.schemas.time import TempoResponse, TempoListOut

router = APIRouter()

@router.get_all("/", response_model=TempoListOut)
async def read_times(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    dia: Optional[int] = Query(None),
    trimestre: Optional[int] = Query(None),
    dia_semana_num: Optional[int] = Query(None),
    dia_do_ano: Optional[int] = Query(None),
    semana_do_ano: Optional[int] = Query(None),
    nome_mes: Optional[str] = Query(None),
    nome_dia_semana: Optional[str] = Query(None),
    ano_mes: Optional[str] = Query(None),
    trimestre_label: Optional[str] = Query(None),
    fim_de_semana: Optional[bool] = Query(None)
):
    total, data = await crud_time.get_all_time(
        db=db,
        skip=skip,
        limit=limit,
        ano=ano,
        mes=mes,
        dia=dia,
        trimestre=trimestre,
        dia_semana_num=dia_semana_num,
        dia_do_ano=dia_do_ano,
        semana_do_ano=semana_do_ano,
        nome_mes=nome_mes,
        nome_dia_semana=nome_dia_semana,
        ano_mes=ano_mes,
        trimestre_label=trimestre_label,
        fim_de_semana=fim_de_semana
    )
    return TempoListOut(total=total, skip=skip, limit=limit, data=data)


@router.get_by_id("/{id_data}", response_model=TempoResponse)
async def read_time(id_data: int, db: AsyncSession = Depends(get_db)):
    obj = await crud_time.get_time_by_id(db=db, id_data=id_data)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time entry not found")
    return obj