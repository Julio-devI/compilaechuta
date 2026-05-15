from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud import operator as crud_operator
from app.schemas.operator import OperatorCreate, OperatorUpdate, OperatorResponse, OperatorListResponse

router = APIRouter()


@router.get("/", response_model=OperatorListResponse)
async def list_operators(
    db: AsyncSession = Depends(deps.get_db),
    current_user: dict = Depends(deps.require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    active: Optional[bool] = Query(None),
) -> Any:
    total, operators = await crud_operator.get_multi_operators(
        db,
        skip=skip,
        limit=limit,
        search=search,
        role=role,
        active=active,
        caller_role=current_user.get("role"),
    )
    return {"total": total, "items": operators}


@router.post("/", response_model=OperatorResponse, status_code=status.HTTP_201_CREATED)
async def create_operator(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: dict = Depends(deps.require_admin),
    operator_in: OperatorCreate,
) -> Any:
    return await crud_operator.create_operator(db=db, obj_in=operator_in)


@router.get("/{id_operador}", response_model=OperatorResponse)
async def get_operator(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: dict = Depends(deps.require_admin),
    id_operador: str,
) -> Any:
    operator = await crud_operator.get_operator(db, id_operador)
    if not operator:
        raise HTTPException(status_code=404, detail="Operador não encontrado")
    return operator


@router.patch("/{id_operador}", response_model=OperatorResponse)
async def update_operator(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: dict = Depends(deps.require_admin),
    id_operador: str,
    operator_in: OperatorUpdate,
) -> Any:
    operator = await crud_operator.get_operator(db, id_operador)
    if not operator:
        raise HTTPException(status_code=404, detail="Operador não encontrado")
    return await crud_operator.update_operator(db=db, db_obj=operator, obj_in=operator_in)


@router.delete("/{id_operador}", response_model=OperatorResponse)
async def delete_operator(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: dict = Depends(deps.require_super_admin),
    id_operador: str,
) -> Any:
    operator = await crud_operator.get_operator(db, id_operador)
    if not operator:
        raise HTTPException(status_code=404, detail="Operador não encontrado")
    return await crud_operator.remove_operator(db=db, id_operador=id_operador)
