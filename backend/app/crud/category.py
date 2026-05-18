import re
import unicodedata
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, asc
from sqlalchemy import func, case
from app.models.products import Produto

from app.models.category import Categoria
from app.models.products import Produto
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
# Cria uma query agregada que calcula os totais baseando-se nos produtos existentes
    stmt = (
        select(
            Categoria,
            func.count(Produto.id_produto).label("total_prod"),
            func.coalesce(func.sum(Produto.estoque_disponivel), 0).label("estoque_total"),
            func.coalesce(func.avg(Produto.preco), 0.0).label("prc_medio"),
            func.sum(case((Produto.precisa_revisao == "Sim", 1), else_=0)).label("total_rev")
        )
        .outerjoin(Produto, Categoria.id_categoria == Produto.id_categoria)
        .group_by(Categoria.id_categoria)
    )
    
    if name:
        # Se houver filtro de nome no CRUD
        stmt = stmt.filter(Categoria.nome_categoria.ilike(f"%{name}%"))
        
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    
    lista_categorias = []
    for row in result.all():
        categoria_obj = row.Categoria
        
        # Injeta os valores calculados dinamicamente nos atributos que o Frontend espera ler
        categoria_obj.total_produtos = row.total_prod
        categoria_obj.total_com_estoque = row.estoque_total
        categoria_obj.preco_medio = row.prc_medio
        categoria_obj.total_precisa_revisao = row.total_rev
        
        lista_categorias.append(categoria_obj)
        
    return lista_categorias


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

async def get_best_selling_category(db: AsyncSession) -> Optional[str]:
    query = (
        select(Categoria.nome_categoria, func.sum(Produto.total_unidades_vendidas).label('total_vendido'))
        .join(Produto, Categoria.id_categoria == Produto.id_categoria)
        .group_by(Categoria.nome_categoria)
        .order_by(desc('total_vendido'))
        .limit(1)
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()

async def get_worst_selling_category(db: AsyncSession) -> Optional[str]:
    query = (
        select(Categoria.nome_categoria, func.sum(Produto.total_unidades_vendidas).label('total_vendido'))
        .join(Produto, Categoria.id_categoria == Produto.id_categoria)
        .group_by(Categoria.nome_categoria)
        .order_by(asc('total_vendido'))
        .limit(1)
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()