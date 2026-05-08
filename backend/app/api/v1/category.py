from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.crud import category as crud_category
from app.schemas.category import Category, CategoryCreate, CategoryUpdate, CategoryAnalyticsResponse

router = APIRouter()

@router.get("/", response_model=List[Category])
async def read_categories(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    
    categories = await crud_category.get_multi(db, skip=skip, limit=limit)
    return categories


@router.post("/", response_model=Category, status_code=status.HTTP_201_CREATED)
async def create_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    category_in: CategoryCreate,
) -> Any:

    category = await crud_category.create(db=db, obj_in=category_in)
    return category


@router.get("/analytics", response_model=CategoryAnalyticsResponse)
async def get_category_analytics(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
 
    analytics = await crud_category.get_analytics(db=db, skip=skip, limit=limit)
    return analytics


@router.get("/{id}", response_model=Category)
async def read_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
) -> Any:
   
    category = await crud_category.get(db=db, id=id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return category

@router.put("/{id}", response_model=Category)
async def update_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    category_in: CategoryUpdate,
) -> Any:
    
    category = await crud_category.get(db=db, id=id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    category = await crud_category.update(db=db, db_obj=category, obj_in=category_in)
    return category

@router.delete("/{id}", response_model=Category)
async def delete_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
) -> Any:
    
    category = await crud_category.get(db=db, id=id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    category = await crud_category.remove(db=db, id=id)
    return category