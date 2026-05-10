from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


class Ticket(Base):
    __tablename__ = "fato_suporte_ticket"

    id_ticket              = Column(String, primary_key=True, index=True)
    id_cliente             = Column(String, ForeignKey("dim_cliente.id_cliente"), nullable=False, index=True)
    id_pedido              = Column(String, nullable=True)
    id_produto             = Column(String, nullable=True)
    data_abertura          = Column(DateTime, nullable=True)
    data_resolucao         = Column(DateTime, nullable=True)
    tempo_resolucao_horas  = Column(Float, nullable=True)
    status                 = Column(String, nullable=True)   # aberto | resolvido
    tipo_problema          = Column(String, nullable=True)
    agente_suporte         = Column(String, nullable=True)
    nota_avaliacao         = Column(Float, nullable=True)

    cliente = relationship("Cliente", back_populates="tickets")