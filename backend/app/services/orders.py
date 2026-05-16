import csv
import io
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import orders as crud
from app.schemas.orders import PedidoListOut


class OrderFilters:
    def __init__(
        self,
        status: Optional[str] = None,
        id_pedido_display: Optional[str] = None,
        data_inicio: Optional[str] = None,
        data_fim: Optional[str] = None,
        status_ticket: Optional[str] = None,
        nome_produto: Optional[str] = None,
    ):
        self.status = status
        self.id_pedido_display = id_pedido_display
        self.data_inicio = data_inicio
        self.data_fim = data_fim
        self.status_ticket = status_ticket
        self.nome_produto = nome_produto


async def listar_pedidos(
    db: AsyncSession,
    filters: OrderFilters,
    tipo_cliente: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> PedidoListOut:
    total, data = await crud.get_orders(
        db=db,
        filters=filters,
        tipo_cliente=tipo_cliente,
        skip=skip,
        limit=limit
    )
    return PedidoListOut(total=total, skip=skip, limit=limit, data=data)


async def exportar_pedidos_csv(
        db: AsyncSession, 
        filters: OrderFilters
        ) -> io.StringIO:

        orders = await crud.get_all_orders_for_export(
             db=db,
             filters=filters
        )
    
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "id_pedido", "id_cliente", "id_produto", "nome_produto", "id_data",
            "quantidade_vendas", "valor_unitario", "valor_total_venda",
            "status", "metodo_pagamento",
        ])
        for order in orders:
            writer.writerow([
                order.id_pedido,
                order.id_cliente,
                order.id_produto,
                order.nome_produto,
                order.id_data,
                order.quantidade_vendas,
                order.valor_unitario,
                order.valor_total_venda,
                order.status,
                order.metodo_pagamento,
            ])
        output.seek(0)
        return output

        
