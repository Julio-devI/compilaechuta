import csv
import io
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import clientes as crud
from app.schemas.clientes import ClienteCreate, ClienteListOut, ClienteOut


async def listar_clientes(
    db: AsyncSession,
    regiao: Optional[str],
    valor_minimo: Optional[float],
    frequencia_minima: Optional[int],
    status_ticket: Optional[str],
    skip: int,
    limit: int,
) -> ClienteListOut:
    total, data = await crud.get_all(
        db, regiao, valor_minimo, frequencia_minima, status_ticket, skip, limit
    )
    return ClienteListOut(total=total, skip=skip, limit=limit, data=data)


async def buscar_cliente(db: AsyncSession, cliente_id: str) -> ClienteOut:
    cliente = await crud.get_by_id(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente


async def listar_tickets_cliente(db: AsyncSession, cliente_id: str, status: str) -> list:
    await buscar_cliente(db, cliente_id)  # valida existência
    return await crud.get_tickets_by_status(db, cliente_id, status)


async def exportar_clientes_csv(db: AsyncSession) -> io.StringIO:
    clientes = await crud.get_all_for_export(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id_cliente", "nome_cliente", "cidade", "estado", "regiao",
        "qtd_pedidos_realizados", "total_gasto_brl", "qtd_tickets_suporte",
        "data_ultima_compra", "media_estrelas_dadas", "segmento_rfm",
    ])
    for c in clientes:
        writer.writerow([
            c.id_cliente, c.nome_cliente, c.cidade, c.estado, c.regiao,
            c.qtd_pedidos_realizados, c.total_gasto_brl, c.qtd_tickets_suporte,
            c.data_ultima_compra, c.media_estrelas_dadas, c.segmento_rfm,
        ])
    output.seek(0)
    return output