from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.category import Categoria
from app.schemas.category import CategoryCreate, CategoryUpdate

async def get_category(db: AsyncSession, id_categoria: str) -> Optional[Categoria]:
    result = await db.execute(select(Categoria).filter(Categoria.id_categoria == id_categoria))
    return result.scalars().first()

async def get_multi_categories(
    db: AsyncSession, *, skip: int = 0, limit: int = 100, name: Optional[str] = None
) -> List[Categoria]:
    query = select(Categoria)
    
    if name:
        query = query.filter(Categoria.name.ilike(f"%{name}%"))
        
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_category(db: AsyncSession, *, obj_in: CategoryCreate) -> Categoria:
    obj_in_data = obj_in.model_dump()
        
    db_obj = Categoria(**obj_in_data)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


async def update_category(db: AsyncSession, *, db_obj: Categoria, obj_in: CategoryUpdate) -> Categoria:
    obj_data = db_obj.__dict__
    update_data = obj_in.model_dump(exclude_unset=True)
        
    for field in obj_data:
        if field in update_data:
            setattr(db_obj, field, update_data[field])
            
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


async def remove_category(db: AsyncSession, *, id_categoria: str) -> Optional[Categoria]:
    result = await db.execute(select(Categoria).filter(Categoria.id_categoria == id_categoria))
    obj = result.scalars().first()
    if obj:
        await db.delete(obj)
        await db.commit()
    return obj