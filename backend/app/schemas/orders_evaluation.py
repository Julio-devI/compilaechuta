from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class AvaliacaoPedidoOut(BaseModel):
    id_avaliacao: str
    id_pedido: str
    id_cliente: str
    id_produto: str
    id_categoria: Optional[str] = None
    nome_produto: Optional[str] = None
    nota_produto: Optional[float] = None
    preco: Optional[float] = None
    valor_pedido: Optional[float] = None
    quantidade: Optional[float] = None
    metodo_pagamento: Optional[str] = None
    status: Optional[str] = None
    data_pedido: Optional[datetime] = None
    nota_nps: Optional[float] = Field(None, ge=0, le=10)
    recomenda: Optional[bool] = None
    comentario: Optional[str] = None
    data_avaliacao: Optional[datetime] = None
    categoria_nps: Optional[str] = None
    pct_recomendacoes_sim: Optional[float] = Field(None, ge=0, le=100)
    comentario_consistente: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class AvaliacaoPedidoListOut(BaseModel):
    total: int
    skip: int
    limit: int
    data: list[AvaliacaoPedidoOut]
