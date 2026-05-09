from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TicketBase(BaseModel):
    id_cliente:            str
    id_pedido:             Optional[str] = None
    id_produto:            Optional[str] = None
    status:                Optional[str] = None   # aberto | resolvido
    tipo_problema:         Optional[str] = None
    agente_suporte:        Optional[str] = None
    nota_avaliacao:        Optional[float] = None
    tempo_resolucao_horas: Optional[float] = None


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    status:                Optional[str] = None
    tipo_problema:         Optional[str] = None
    agente_suporte:        Optional[str] = None
    nota_avaliacao:        Optional[float] = None
    tempo_resolucao_horas: Optional[float] = None
    data_resolucao:        Optional[datetime] = None


class TicketOut(TicketBase):
    id_ticket:      str
    data_abertura:  Optional[datetime] = None
    data_resolucao: Optional[datetime] = None

    class Config:
        from_attributes = True