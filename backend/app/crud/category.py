import re
import unicodedata
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlalchemy.future import select

from app.models.category import Categoria
from app.schemas.category import CategoryCreate, CategoryUpdate

async def generate_category_id(db: AsyncSession) -> str:
    result = await db.execute(
        select(func.count()).select_from(Categoria)
    )

    total = result.scalar() or 0
    next_number = total + 1

    return f"CATEG-{next_number:04d}"

def generate_slug(nome: str) -> str:
    slug = nome.strip().lower()

    slug = unicodedata.normalize("NFD", slug)
    slug = slug.encode("ascii", "ignore").decode("utf-8")

    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)

    return slug


async def get_category_by_slug(db: AsyncSession, slug: str):
    result = await db.execute(
        select(Categoria).where(
            Categoria.slug_categoria == slug
        )
    )

    return result.scalar_one_or_none()

async def get_category_by_id(db: AsyncSession, id_categoria: str) -> Optional[Categoria]:
    result = await db.execute(select(Categoria).filter(Categoria.id_categoria == id_categoria))
    return result.scalars().first()

async def get_all_categories(
    db: AsyncSession, *, skip: int = 0, limit: int = 100, name: Optional[str] = None
) -> List[Categoria]:
    query = select(Categoria)
    
    if name:
        query = query.filter(Categoria.name.ilike(f"%{name}%"))
        
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_category(db: AsyncSession, *, obj_in: CategoryCreate, slug_categoria: str,) -> Categoria:

    category_id = await generate_category_id(db)

    category = Categoria(
        id_categoria=category_id,
        nome_categoria=obj_in.nome_categoria.strip(),
        slug_categoria=slug_categoria,
        imagem_url=obj_in.imagem_url,
    )

    db.add(category)

    await db.commit()
    await db.refresh(category)

    return category

async def update_category(db: AsyncSession, *, db_obj: Categoria, obj_in: CategoryUpdate) -> Categoria:

    update_data = obj_in.model_dump(exclude_unset=True)

    if "nome_categoria" in update_data:
        novo_nome = update_data["nome_categoria"].strip()

        slug = generate_slug(novo_nome)

        update_data["nome_categoria"] = novo_nome
        update_data["slug_categoria"] = slug

    for field, value in update_data.items():
        setattr(db_obj, field, value)

    db.add(db_obj)

    await db.commit()
    await db.refresh(db_obj)

    return db_obj


async def delete_category(db: AsyncSession, *, id_categoria: str) -> Optional[Categoria]:
    result = await db.execute(select(Categoria).filter(Categoria.id_categoria == id_categoria))
    obj = result.scalars().first()
    if obj:
        await db.delete(obj)
        await db.commit()
    return obj