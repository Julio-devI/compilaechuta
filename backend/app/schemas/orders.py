from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator

class PedidoBase(BaseModel):
    id_pedido_display:  str
    id_pedido: str
    id_cliente:        str
    id_produto:        str
    nome_produto: str
    id_data:           Optional[str] = None
    quantidade_vendas: Optional[int]   = Field(None, gt=0)
    valor_unitario:    Optional[float] = Field(None, gt=0)
    valor_total_venda: Optional[float] = Field(None, gt=0)
    status:            Optional[Literal["Aprovado", "Processando", "Recusado", "Reembolsado"]] = None
    metodo_pagamento:  Optional[Literal["PIX", "Boleto", "Cartao"]] = None

    model_config = ConfigDict(from_attributes=True)


class PedidoCreate(PedidoBase):
    pass


class PedidoUpdate(BaseModel):
    status:            Optional[Literal["Aprovado", "Processando", "Recusado", "Reembolsado"]] = None
    quantidade_vendas: Optional[int]   = Field(None, gt=0)
    valor_unitario:    Optional[float] = Field(None, gt=0)
    valor_total_venda: Optional[float] = Field(None, gt=0)
    metodo_pagamento:  Optional[Literal["PIX", "Boleto", "Cartao"]] = None


class PedidoOut(PedidoBase):
    nome_cliente: Optional[str] = None
    cidade_cliente: Optional[str] = None
    estado_cliente: Optional[str] = None
    segmento_cliente: Optional[str] = None
    qtd_tickets_cliente: Optional[int] = None
    media_estrelas_cliente: Optional[float] = None
    qtd_pedidos_cliente: Optional[int] = None

    @field_validator("quantidade_vendas", mode="before")
    @classmethod
    def tratar_quantidade(cls, v):
        if v is not None and v <= 0:
            return None
        return v

    @field_validator("valor_unitario", "valor_total_venda", mode="before")
    @classmethod
    def tratar_valores(cls, v):
        if v is not None and v < 0:
            return None
        return v

    class Config:
        from_attributes = True


class PedidoListOut(BaseModel):
    total: int
    skip:  int
    limit: int
    data:  list[PedidoOut]