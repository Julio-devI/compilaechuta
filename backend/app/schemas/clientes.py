from pydantic import BaseModel
from typing import Optional
import datetime


class ClienteBase(BaseModel):
    nome_cliente: str
    cidade:       Optional[str] = None
    estado:       Optional[str] = None
    regiao:       Optional[str] = None


class ClienteCreate(ClienteBase):
    pass


class ClienteOut(ClienteBase):
    id_cliente:             str
    qtd_pedidos_realizados: int
    total_gasto_brl:        float
    qtd_tickets_suporte:    int
    data_ultima_compra:     Optional[datetime.datetime] = None
    media_estrelas_dadas:   Optional[float] = None
    segmento_rfm:           Optional[str] = None

    class Config:
        from_attributes = True


class ClienteListOut(BaseModel):
    total: int
    skip:  int
    limit: int
    data:  list[ClienteOut]