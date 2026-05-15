from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator

class TicketBase(BaseModel):
    id_cliente:            str
    id_pedido:             Optional[str] = None
    id_produto:            Optional[str] = None
    status:                Optional[Literal["aberto", "resolvido"]] = None
    tipo_problema:         Optional[str] = None
    agente_suporte:        Optional[str] = None
    nota_avaliacao:        Optional[float] = Field(None, ge=0, le=5)
    tempo_resolucao_horas: Optional[float] = Field(None, gt=0)


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    status:                Optional[Literal["aberto", "resolvido"]] = None
    tipo_problema:         Optional[str] = None
    agente_suporte:        Optional[str] = None
    nota_avaliacao:        Optional[float] = Field(None, ge=1, le=5)
    tempo_resolucao_horas: Optional[float] = Field(None, gt=0)
    data_resolucao:        Optional[datetime] = None


class TicketOut(TicketBase):
    id_ticket:          str
    id_pedido_display:  Optional[str] = None
    data_abertura:      Optional[datetime] = None
    data_resolucao:     Optional[datetime] = None
    nota_avaliacao:     Optional[float] = None

    @field_validator("nota_avaliacao", mode="before")
    @classmethod
    def tratar_nota_invalida(cls, v):
        if v is not None and v < 0:
            return None
        return v

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.strftime("%Y-%m-%d %H:%M:%S") if v is not None else None
        }