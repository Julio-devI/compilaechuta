import re
import unicodedata

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import category as crud
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse


def generate_slug(nome: str) -> str:
    slug = nome.strip().lower()

    slug = unicodedata.normalize("NFD", slug)
    slug = slug.encode("ascii", "ignore").decode("utf-8")

    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)

    return slug


async def get_all_categories(db: AsyncSession, skip: int, limit: int) -> list[CategoryResponse]:
    if skip < 0:
        raise HTTPException(status_code=400, detail="skip deve ser maior ou igual a 0")

    if limit < 1 or limit > 500:
        raise HTTPException(status_code=400, detail="limit deve estar entre 1 e 500")

    return await crud.get_all_categories(db, skip=skip, limit=limit)


async def get_category_by_id(db: AsyncSession, category_id: str) -> CategoryResponse:
    category = await crud.get_category_by_id(db, category_id)

    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    return category


async def create_category(db: AsyncSession, category: CategoryCreate) -> CategoryResponse:
    nome_categoria = category.nome_categoria.strip()

    if len(nome_categoria) < 2:
        raise HTTPException(status_code=400, detail="nome_categoria muito curto")

    slug_categoria = generate_slug(nome_categoria)

    existing_category = await crud.get_category_by_slug(db, slug_categoria)

    if existing_category:
        raise HTTPException(status_code=409, detail="Já existe uma categoria com esse nome")

    return await crud.create_category(
        db=db,
        obj_in=category,
        slug_categoria=slug_categoria,
    )


async def update_category(
    db: AsyncSession,
    category_id: str,
    category: CategoryUpdate,
) -> CategoryResponse:

    db_category = await crud.get_category_by_id(db, category_id)

    if not db_category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    if category.nome_categoria:
        slug_categoria = generate_slug(category.nome_categoria)

        existing_category = await crud.get_category_by_slug(db, slug_categoria)

        if existing_category and existing_category.id_categoria != category_id:
            raise HTTPException(status_code=409, detail="Já existe uma categoria com esse nome")

    return await crud.update_category(
        db=db,
        db_obj=db_category,
        obj_in=category,
    )


async def delete_category(db: AsyncSession, id_categoria: str) -> dict:
    db_category = await crud.get_category_by_id(db, id_categoria)

    if not db_category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    await crud.delete_category(
        db=db,
        id_categoria=id_categoria,
    )

    return {"message": "Categoria deletada com sucesso"}