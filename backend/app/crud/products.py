from typing import List, Optional
from sqlalchemy import func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from app.models.products import Produto
from app.models.orders import Pedido
from app.schemas.products import ProductCreate, ProductUpdate

async def create_product(db: AsyncSession, product_in: ProductCreate) -> Produto:
    product_data = product_in.model_dump()
    
    db_product = Produto(**product_data)
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product

async def get_productById(db: AsyncSession, id_produto: str) -> Optional[Produto]:
    result = await db.execute(
        select(Produto)
        .options(joinedload(Produto.categoria))
        .filter(Produto.id_produto == id_produto)
    )
    return result.scalars().first()


async def get_all_products(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        categoria: Optional[str] = None,
        status: Optional[str] = None,
        preco_min: Optional[float] = None,
        preco_max: Optional[float] = None
) -> List[Produto]:
    query = select(Produto).options(joinedload(Produto.categoria))

    if categoria and categoria != 'Todas as Categorias':
        query = query.join(Produto.categoria).filter(Produto.categoria.has(nome_categoria=categoria))

    if status:
        if status == 'ativo':
            query = query.filter(Produto.ativo.in_(['Sim', 'sim', 'True', 'true', '1', True]))

        elif status == 'inativo':
            query = query.filter(Produto.ativo.in_(['Não', 'não', 'Nao', 'nao', 'False', 'false', '0', False]))

        elif status == 'baixo_estoque':
            query = query.filter(
                Produto.estoque_disponivel < 10,
                Produto.ativo.in_(['Sim', 'sim', 'True', 'true', '1', True])
            )

    # 3. Filtro de Preço
    if preco_min is not None:
        query = query.filter(Produto.preco >= preco_min)

    if preco_max is not None:
        query = query.filter(Produto.preco <= preco_max)

    result = await db.execute(query.offset(skip).limit(limit))
    return list(result.scalars().all())

async def get_total_products_count(db: AsyncSession) -> int:
    query = select(func.count(Produto.id_produto))
    result = await db.execute(query)
    return result.scalar_one()

async def get_top_selling_product(db: AsyncSession) -> Optional[str]:
    query = (
        select(Produto.nome_produto)
        .order_by(desc(Produto.total_unidades_vendidas))
        .limit(1)
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()

async def update_product(db: AsyncSession, id_produto: str, product_in: ProductUpdate) -> Optional[Produto]:
    db_product = await get_productById(db, id_produto)
    if not db_product:
        return None
    
    update_data = product_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_product, field, value)
        
    await db.commit()
    await db.refresh(db_product)
    
    return db_product

async def delete_product(db: AsyncSession, id_produto: str) -> bool:
    db_product = await get_productById(db, id_produto)
    if not db_product:
        return False

    await db.delete(db_product)
    await db.commit()
    return True


async def get_products_by_cliente(
    db: AsyncSession,
    id_cliente: str,
    skip: int = 0,
    limit: int = 100,
) -> tuple[int, List[Produto]]:
    query = (
        select(Produto)
        .join(Pedido, Pedido.id_produto == Produto.id_produto)
        .where(Pedido.id_cliente == id_cliente)
        .distinct()
    )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(query.offset(skip).limit(limit))
    return total, list(result.scalars().all())