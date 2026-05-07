from typing import List, Optional
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.products import Produto
from app.schemas.products import ProductCreate, ProductUpdate

async def create_product(db: AsyncSession, product_in: ProductCreate) -> Produto:
    product_data = product_in.model_dump()
    
    # initializing some additional fields
    brazil_timezone = ZoneInfo("America/Sao_Paulo")
    product_data["data_cadastro_produto"] = datetime.now(brazil_timezone).date()
    product_data["tem_estoque"] = product_data.get("estoque_disponivel", 0) > 0
    
    db_product = Produto(**product_data)
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product

async def get_productById(db: AsyncSession, product_id: int) -> Optional[Produto]:
    result = await db.execute(select(Produto).filter(Produto.id_produto == product_id))
    return result.scalars().first()

async def get_all_products(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100,
    categoria: Optional[str] = None
) -> List[Produto]:
    
    query = select(Produto)
    
    if categoria:
        query = query.filter(Produto.categoria == categoria)
        
    # query and pagination
    result = await db.execute(query.offset(skip).limit(limit))
    return list(result.scalars().all())

async def update_product(db: AsyncSession, product_id: int, product_in: ProductUpdate) -> Optional[Produto]:
    db_product = await get_productById(db, product_id)
    if not db_product:
        return None
    
    update_data = product_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_product, field, value)
        
    if "estoque_disponivel" in update_data:
        db_product.tem_estoque = db_product.estoque_disponivel > 0
        
    await db.commit()
    await db.refresh(db_product)
    
    return db_product

async def delete_product(db: AsyncSession, product_id: int) -> bool:
    db_product = await get_productById(db, product_id)
    if not db_product:
        return False
        
    await db.delete(db_product)
    await db.commit()
    return True
