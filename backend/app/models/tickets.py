from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import datetime

from app.core.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id              = Column(Integer, primary_key=True, index=True)
    cliente_id      = Column(String, ForeignKey("clientes.id_cliente"), nullable=False, index=True)
    tipo            = Column(String)
    status          = Column(String, default="aberto")  # aberto | fechado
    descricao       = Column(Text)
    sentimento      = Column(String)                    # positivo | neutro | negativo
    tempo_resolucao = Column(Integer)                   # em minutos
    data_abertura   = Column(DateTime, default=datetime.datetime.utcnow)
    data_fechamento = Column(DateTime, nullable=True)

    cliente = relationship("Cliente", back_populates="tickets")