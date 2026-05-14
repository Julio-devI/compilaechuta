import csv
import io
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import orders as crud
from app.schemas.orders import PedidoListOut


async def listar_pedidos(
    db: AsyncSession,
    status: Optional[str] = None,
    id_produto: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    tipo_cliente: Optional[str] = None,
    status_ticket: Optional[str] = None,
    nome_produto: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> PedidoListOut:
    total, data = await crud.get_orders(
        db=db,
        status=status,
        id_produto=id_produto,
        data_inicio=data_inicio,
        data_fim=data_fim,
        tipo_cliente=tipo_cliente,
        status_ticket=status_ticket,
        nome_produto=nome_produto,
        skip=skip,
        limit=limit
    )
    return PedidoListOut(total=total, skip=skip, limit=limit, data=data)


async def exportar_pedidos_csv(db: AsyncSession):
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "id_pedido", "id_cliente", "id_produto", "nome_produto", "id_data",
        "quantidade_vendas", "valor_unitario", "valor_total_venda",
        "status", "metodo_pagamento",
    ])

    yield output.getvalue()
    output.seek(0)
    output.truncate(0)

    contador_linhas = 0

    async for p in crud.get_orders_stream(db):
        writer.writerow([
            p.id_pedido, p.id_cliente, p.id_produto, getattr(
                p, "nome_produto", ""), p.id_data,
            p.quantidade_vendas, p.valor_unitario, p.valor_total_venda,
            p.status, p.metodo_pagamento,
        ])

        contador_linhas += 1

        if contador_linhas >= 1000:
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)
            contador_linhas = 0

    if output.tell() > 0:
        yield output.getvalue()
