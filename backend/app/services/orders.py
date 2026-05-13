import csv
import io
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import orders as crud
from app.schemas.orders import PedidoListOut


async def listar_pedidos(
    db: AsyncSession,
    status: Optional[str],
    id_produto: Optional[str],
    data_inicio: Optional[str],
    data_fim: Optional[str],
    tipo_cliente: Optional[str],
    status_ticket: Optional[str],
    skip: int,
    limit: int,
) -> PedidoListOut:
    total, data = await crud.get_orders(
        db, status, id_produto, data_inicio, data_fim, tipo_cliente, status_ticket, skip, limit
        )
    return PedidoListOut(total=total, skip=skip, limit=limit, data=data)


async def exportar_pedidos_csv(db: AsyncSession) -> io.StringIO:
    pedidos = await crud.get_all_orders_for_export(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id_pedido", "id_cliente", "id_produto", "id_data",
        "quantidade_vendas", "valor_unitario", "valor_total_venda",
        "status", "metodo_pagamento",
    ])
    for p in pedidos:
        writer.writerow([
            p.id_pedido, p.id_cliente, p.id_produto, p.id_data,
            p.quantidade_vendas, p.valor_unitario, p.valor_total_venda,
            p.status, p.metodo_pagamento,
        ])
    output.seek(0)
    return output
