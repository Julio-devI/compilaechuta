from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.products import ProductCreate, ProductUpdate, ProductResponse, ProductListOut
from app.services import products as product_service

import csv
import io
from fastapi.responses import StreamingResponse

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
    status: Optional[str] = None,       # <-- Filtro novo
    preco_min: Optional[float] = None,  # <-- Filtro novo
    preco_max: Optional[float] = None,  # <-- Filtro novo
    precisa_revisao: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    return await product_service.get_all_products(
        db=db, 
        skip=skip, 
        limit=limit, 
        categoria=categoria,
        status=status,
        preco_min=preco_min,
        preco_max=preco_max,
        precisa_revisao=precisa_revisao,
    )


@router.get("/{id_produto}", response_model=ProductResponse)
async def get_productById(
    id_produto: str,
    db: AsyncSession = Depends(get_db)
):
    return await product_service.get_productById(db=db, id_produto=id_produto)


@router.patch("/{id_produto}", response_model=ProductResponse)
async def update_product(
    id_produto: str,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db)
):
    return await product_service.update_product(db=db, id_produto=id_produto, product_in=product_in)


@router.delete("/{id_produto}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    id_produto: str,
    db: AsyncSession = Depends(get_db)
):
    await product_service.delete_product(db=db, id_produto=id_produto)

@router.get("/exportar/csv")
async def exportar_produtos_csv(db: AsyncSession = Depends(get_db)):
    produtos = await product_service.get_all_products(db=db, skip=0, limit=99999)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id_produto", "nome_produto", "sku", "categoria", "fornecedor",
        "preco", "estoque_disponivel", "ativo", "total_pedidos",
        "receita_total", "media_nota_produto"
    ])
    for p in produtos:
        writer.writerow([
            p.id_produto, p.nome_produto, p.sku, p.categoria, p.fornecedor,
            p.preco, p.estoque_disponivel, p.ativo, p.total_pedidos,
            p.receita_total, p.media_nota_produto
        ])
    
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=produtos.csv"}
    )