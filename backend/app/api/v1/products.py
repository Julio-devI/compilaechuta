from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
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


@router.get("/{id_produto}", response_model=ProductResponse)
async def get_productById(
    id_produto: str,
    db: AsyncSession = Depends(get_db)
):
    product = await product_service.get_productById(db=db, product_id=id_produto)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product


@router.patch("/{id_produto}", response_model=ProductResponse)
async def update_product(
    id_produto: str,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db)
):
    product = await product_service.update_product(db=db, product_id=id_produto, product_in=product_in)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product


@router.delete("/{id_produto}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    id_produto: str,
    db: AsyncSession = Depends(get_db)
):
    # Verifique ou modifique em service se delete retorna uma validação
    product = await product_service.get_productById(db=db, product_id=id_produto)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    await product_service.delete_product(db=db, product_id=id_produto)