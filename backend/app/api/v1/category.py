from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud import category as crud_category
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
async def read_categories(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    categories = await crud_category.get_multi_categories(db, skip=skip, limit=limit)
    return categories


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    category_in: CategoryCreate,
) -> Any:
    category = await crud_category.create_category(db=db, obj_in=category_in)
    return category


@router.get("/{id_categoria}", response_model=CategoryResponse)
async def read_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id_categoria: str,
) -> Any:
    category = await crud_category.get_category(db=db, id_categoria=id_categoria)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return category

@router.patch("/{id_categoria}", response_model=CategoryResponse)
async def update_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id_categoria: str,
    category_in: CategoryUpdate,
) -> Any:
    category = await crud_category.get_category(db=db, id_categoria=id_categoria)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    category = await crud_category.update_category(db=db, db_obj=category, obj_in=category_in)
    return category

@router.delete("/{id_categoria}", response_model=CategoryResponse)
async def delete_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id_categoria: str,
) -> Any:
    category = await crud_category.get_category(db=db, id_categoria=id_categoria)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    category = await crud_category.remove_category(db=db, id_categoria=id_categoria)
    return category