from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
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
    qtd_pedidos_realizados: int   = Field(0, ge=0)
    total_gasto_brl:        float = Field(0.0, ge=0)
    qtd_tickets_suporte:    int   = Field(0, ge=0)
    data_ultima_compra:     Optional[datetime.datetime] = None
    media_estrelas_dadas:   Optional[float] = Field(None, ge=0, le=5)
    segmento_rfm:           Optional[str] = None
    categoria_interesse:    Optional[str] = None
    tem_ticket_aberto:      Optional[bool] = None

    @field_validator("media_estrelas_dadas", mode="before")
    @classmethod
    def tratar_nota_invalida(cls, v):
        if v is not None and v < 0:
            return None
        return v

    class Config:
        from_attributes = True


class ClienteListOut(BaseModel):
    total: int
    skip:  int
    limit: int
    data:  list[ClienteOut]
