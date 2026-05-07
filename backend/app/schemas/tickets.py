from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Esquema base com campos comuns
class TicketBase(BaseModel):
    client_id: str
    product_id: Optional[int] = None
    status: str  # Aberto, Em andamento, Resolvido
    issue_description: str
    sentiment: Optional[str] = None # Requisito Gold: Sentimento do cliente
    resolution_time: Optional[int] = None # Requisito Gold: Tempo em dias

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    issue_description: Optional[str] = None
    sentiment: Optional[str] = None
    resolution_time: Optional[int] = None

# Esquema para resposta da API (inclui IDs e datas)
class Ticket(TicketBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True