from typing import Any, List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services import category as service_category

router = APIRouter()


@router.get("/", response_model=List[CategoryResponse])
async def read_categories(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return await service_category.get_all_categories(db, skip, limit)


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    category_in: CategoryCreate,
) -> Any:
    return await service_category.create_category(db, category_in)


@router.get("/{id_categoria}", response_model=CategoryResponse)
async def read_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id_categoria: str,
) -> Any:
    return await service_category.get_category_by_id(db, id_categoria)


@router.patch("/{id_categoria}", response_model=CategoryResponse)
async def update_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id_categoria: str,
    category_in: CategoryUpdate,
) -> Any:
    return await service_category.update_category(db, id_categoria, category_in)


@router.delete("/{id_categoria}")
async def delete_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id_categoria: str,
) -> Any:
    return await service_category.delete_category(db, id_categoria)