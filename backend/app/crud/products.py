from typing import List, Optional
import re
import unicodedata
from sqlalchemy import func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from fastapi import HTTPException, status 

from app.models.products import Produto
from app.models.orders import Pedido
from app.schemas.products import ProductCreate, ProductUpdate


class ProductFilters:
    def __init__(
        self,
        categoria: Optional[str] = None,
        status: Optional[str] = None,
        preco_min: Optional[float] = None,
        preco_max: Optional[float] = None,
        nome_produto: Optional[str] = None
    ):
        self.categoria = categoria
        self.status = status
        self.preco_min = preco_min
        self.preco_max = preco_max
        self.nome_produto = nome_produto
    
    


def _filters_query(query, filters: ProductFilters):
    
    if filters.categoria and filters.categoria != 'Todas as Categorias':
        query = query.join(Produto.categoria).filter(Produto.categoria.has(nome_categoria=filters.categoria))

    if filters.status:
        if filters.status == 'ativo':
            query = query.filter(Produto.ativo.in_(['Sim', 'sim', 'True', 'true', '1', True]))

        elif filters.status == 'inativo':
            query = query.filter(Produto.ativo.in_(['Não', 'não', 'Nao', 'nao', 'False', 'false', '0', False]))

        elif filters.status == 'baixo_estoque':
            query = query.filter(
                Produto.estoque_disponivel < 10,
                Produto.ativo.in_(['Sim', 'sim', 'True', 'true', '1', True])
            )

    if filters.preco_min is not None:
        query = query.filter(Produto.preco >= filters.preco_min)

    if filters.preco_max is not None:
        query = query.filter(Produto.preco <= filters.preco_max)
    
    if filters.nome_produto:
        query = query.filter(Produto.nome_produto.ilike(f"%{filters.nome_produto}%"))

    return query



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
        precisa_revisao: Optional[str] = None, 
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

    if precisa_revisao is not None:
        query = query.filter(Produto.precisa_revisao == precisa_revisao)

    result = await db.execute(query.offset(skip).limit(limit))
    return list(result.scalars().all())


async def get_all_products_for_export(
        db: AsyncSession,
        categoria: Optional[str] = None,
        status: Optional[str] = None,
        preco_min: Optional[float] = None,
        preco_max: Optional[float] = None,
        nome_produto: Optional[str] = None
    ) -> list[Produto]:
    
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

    if preco_min is not None:
        query = query.filter(Produto.preco >= preco_min)

    if preco_max is not None:
        query = query.filter(Produto.preco <= preco_max)

    if nome_produto:
        query = query.filter(Produto.nome_produto.contains(nome_produto))

    result = await db.execute(query)
    return list(result.scalars().all())


async def get_all_suppliers(db: AsyncSession) -> List[str]:
    query = select(Produto.fornecedor).distinct()

    result = await db.execute(query)

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
    
    altered_relantionship = False 
    obj_new_category = None
    
    if "categoria" in update_data:
        nome_categoria = update_data.pop("categoria")
        
        if nome_categoria:
            from app.models.category import Categoria

            texto_sem_acento = "".join(
                c for c in unicodedata.normalize('NFD', nome_categoria)
                if unicodedata.category(c) != 'Mn'
            )
            slug_buscado = texto_sem_acento.lower().strip().replace(" ", "-")
            
            stmt = select(Categoria).where(
                Categoria.slug_categoria == slug_buscado
            )
            result = await db.execute(stmt)
            obj_new_category = result.scalar_one_or_none()
            
            if obj_new_category:
                update_data["id_categoria"] = obj_new_category.id_categoria
                altered_relantionship = True
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Não foi possível encontrar uma categoria correspondente ao slug '{slug_buscado}'."
                )

    if "nome_produto" in update_data or "fornecedor" in update_data or altered_relantionship:
        novo_nome_produto = update_data.get("nome_produto", db_product.nome_produto)
        novo_fornecedor = update_data.get("fornecedor", db_product.fornecedor)
        
        if altered_relantionship and obj_new_category:
            nova_cat_string = obj_new_category.nome_categoria
        elif db_product.categoria:
            nova_cat_string = db_product.categoria.nome_categoria
        else:
            nova_cat_string = "Outros"
            
        novo_sku = generate_sku(
            id_produto=id_produto,
            categoria=str(nova_cat_string),
            nome_produto=str(novo_nome_produto),
            fornecedor=str(novo_fornecedor or "Desconhecido")
        )
        update_data["sku"] = novo_sku

    for field, value in update_data.items():
        setattr(db_product, field, value)
    
    if altered_relantionship and obj_new_category:
        db_product.categoria = obj_new_category
        
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