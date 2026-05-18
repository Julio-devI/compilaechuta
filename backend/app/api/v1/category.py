from typing import Any, List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api import deps
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services import category as service_category

router = APIRouter()


class BestSellingCategoryResponse(BaseModel):
    category: str

class WorstSellingCategoryResponse(BaseModel):
    category: str

@router.get("/best-selling", response_model=BestSellingCategoryResponse)
async def get_best_selling_category(db: AsyncSession = Depends(deps.get_db)) -> Any:
    category = await crud_category.get_best_selling_category(db=db)
    return BestSellingCategoryResponse(category=category or "Nenhuma")

@router.get("/worst-selling", response_model=WorstSellingCategoryResponse)
async def get_worst_selling_category(db: AsyncSession = Depends(deps.get_db)) -> Any:
    category = await crud_category.get_worst_selling_category(db=db)
    return WorstSellingCategoryResponse(category=category or "Nenhuma")

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