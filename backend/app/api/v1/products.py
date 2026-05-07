from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.products import ProductCreate, ProductUpdate, ProductResponse
from app.services import products as product_service

router = APIRouter()

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db)
):
    return await product_service.create_product(db=db, product_in=product_in)


@router.get("/", response_model=List[ProductResponse])
async def get_all_products(
    skip: int = 0,
    limit: int = 100,
    categoria: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    return await product_service.get_all_products(db=db, skip=skip, limit=limit, categoria=categoria)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_productById(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    return await product_service.get_productById(db=db, product_id=product_id)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db)
):
    return await product_service.update_product(db=db, product_id=product_id, product_in=product_in)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    await product_service.delete_product(db=db, product_id=product_id)