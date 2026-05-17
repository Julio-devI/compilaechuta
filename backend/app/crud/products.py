from typing import List, Optional
import re
import unicodedata
from sqlalchemy import func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from app.models.products import Produto
from app.models.orders import Pedido
from app.schemas.products import ProductCreate, ProductUpdate


async def generate_product_id(db: AsyncSession) -> str:
    query = select(Produto.id_produto).order_by(
        Produto.id_produto.desc()).limit(1)
    result = await db.execute(query)
    last_id = result.scalar_one_or_none()

    if last_id is None:
        next_number = 1
    else:
        try:
            current_number = int(last_id.split('-')[1])
            next_number = current_number + 1
        except (IndexError, ValueError):
            next_number = 1

    return f"PROD-{str(next_number).zfill(4)}"


def _limpar_e_maiusculo(texto: str) -> str:
    if not texto:
        return ""
    texto_sem_acento = "".join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    )
    texto_limpo = re.sub(r'[^a-zA-Z0-9\s]', '', texto_sem_acento)
    return texto_limpo.upper().strip()

def generate_sku(id_produto: str, categoria: str, nome_produto: str, fornecedor: str) -> str:
    # 1. Categoria (4 primeiras letras)
    cat_limpa = _limpar_e_maiusculo(categoria).replace(" ", "")
    comp_categoria = cat_limpa[:4] if cat_limpa else "UNKN"

    # 2. Produto (Primeira palavra)
    palavras_produto = _limpar_e_maiusculo(nome_produto).split()
    comp_produto = palavras_produto[0] if palavras_produto else "PROD"

    # 3. Fornecedor (Primeira palavra)
    palavras_fornecedor = _limpar_e_maiusculo(fornecedor).split()
    comp_fornecedor = palavras_fornecedor[0] if palavras_fornecedor else "FORN"

    # 4. Extrai os números do id_produto (ex: "PROD-0001" -> "0001")
    try:
        comp_id = id_produto.split('-')[1]
    except (IndexError, ValueError):
        comp_id = "".join(c for c in id_produto if c.isdigit()).zfill(4)

    if not comp_id:
        comp_id = "0001"

    return f"{comp_categoria}-{comp_produto}-{comp_fornecedor}-{comp_id}"

async def create_product(db: AsyncSession, product_in: ProductCreate) -> Produto:
    id_produto = await generate_product_id(db)
    sku_produto = generate_sku(
        id_produto=id_produto,
        categoria=str(product_in.categoria or "Outros"),
        nome_produto=product_in.nome_produto,
        fornecedor=product_in.fornecedor or "Desconhecido"
        )

    product_data = product_in.model_dump()
    nome_categoria = product_data.pop("categoria", None)

    product_data["id_produto"] = id_produto
    product_data["sku"] = sku_produto

    id_categoria_encontrado = None
    if nome_categoria:
        from app.models.category import Categoria

        print("Categoria que veio: ", nome_categoria)

        stmt = select(Categoria.id_categoria).where(
            func.lower(Categoria.nome_categoria) == func.lower(nome_categoria)
        )
        result = await db.execute(stmt)
        id_categoria_encontrado = result.scalar_one_or_none()

    if id_categoria_encontrado:
        product_data["id_categoria"] = id_categoria_encontrado

    db_product = Produto(**product_data)

    db.add(db_product)
    await db.commit()

    query = (
        select(Produto)
        .options(joinedload(Produto.categoria))
        .filter(Produto.id_produto == id_produto)
    )
    result = await db.execute(query)
    db_product_completo = result.scalars().first()

    return db_product_completo

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