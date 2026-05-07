from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TicketBase(BaseModel):
    cliente_id:     str
    tipo:           Optional[str] = None
    status:         str = "aberto"          # aberto | fechado
    descricao:      Optional[str] = None
    sentimento:     Optional[str] = None    # positivo | neutro | negativo
    tempo_resolucao: Optional[int] = None   # em minutos


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    tipo:            Optional[str] = None
    status:          Optional[str] = None
    descricao:       Optional[str] = None
    sentimento:      Optional[str] = None
    tempo_resolucao: Optional[int] = None
    data_fechamento: Optional[datetime] = None


class TicketOut(TicketBase):
    id:              int
    data_abertura:   datetime
    data_fechamento: Optional[datetime] = None

    class Config:
        from_attributes = True