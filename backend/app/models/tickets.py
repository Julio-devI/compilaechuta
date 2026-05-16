from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer, Index
from sqlalchemy.orm import relationship

from app.core.database import Base


class Ticket(Base):
    __tablename__ = "fato_suporte_ticket"

    id_ticket              = Column(String, primary_key=True, index=True)
    id_cliente             = Column(String, ForeignKey("dim_cliente.id_cliente"), nullable=False, index=True)
    id_pedido              = Column(String, ForeignKey("fato_vendas.id_pedido"), nullable=True, index=True)
    id_produto = Column(String, ForeignKey(
        "dim_produto.id_produto"), nullable=True, index=True)
    data_abertura          = Column(DateTime, nullable=True)
    data_resolucao         = Column(DateTime, nullable=True)
    tempo_resolucao_horas  = Column(Float, nullable=True)
    status = Column(String, nullable=True, index=True)   # aberto | resolvido
    tipo_problema          = Column(String, nullable=True)
    agente_suporte         = Column(String, nullable=True)
    nota_avaliacao         = Column(Float, nullable=True)

    # Alterado para lazy="select" para evitar LEFT OUTER JOIN massivos nas listagens
    pedido = relationship("Pedido", back_populates="tickets", lazy="select")
    cliente = relationship("Cliente", back_populates="tickets", lazy="select")
    
    # Índice composto para buscas rápidas de tickets por pedido + status
    __table_args__ = (
        Index("ix_fato_suporte_ticket_id_pedido_status", "id_pedido", "status"),
    )
