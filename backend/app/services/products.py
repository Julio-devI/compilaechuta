from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.crud import products as crud_products
from app.schemas.products import ProductCreate, ProductUpdate
from app.models.products import Produto

async def create_product(db: AsyncSession, product_in: ProductCreate) -> Produto:
    try:
        return await crud_products.create_product(db=db, product_in=product_in)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro de integridade: Verifique se a Categoria informada realmente existe."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar produto: {str(e)}"
        )

async def get_productById(db: AsyncSession, id_produto: str) -> Produto:
    product = await crud_products.get_productById(db=db, id_produto=id_produto)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado."
        )
    return product

async def get_all_products(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100, 
    categoria: Optional[str] = None,
    status: Optional[str] = None,       # <-- Filtro novo
    preco_min: Optional[float] = None,  # <-- Filtro novo
    preco_max: Optional[float] = None   # <-- Filtro novo
) -> List[Produto]:
    
    return await crud_products.get_all_products(
        db=db, 
        skip=skip, 
        limit=limit, 
        categoria=categoria,
        status=status,
        preco_min=preco_min,
        preco_max=preco_max
    )

async def update_product(db: AsyncSession, id_produto: str, product_in: ProductUpdate) -> Produto:
    updated_product = await crud_products.update_product(
        db=db, id_produto=id_produto, product_in=product_in
    )
    if not updated_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado."
        )
    return updated_product

async def delete_product(db: AsyncSession, id_produto: str) -> bool:
    success = await crud_products.delete_product(db=db, id_produto=id_produto)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado."
        )
    return True