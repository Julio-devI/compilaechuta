from sqlalchemy import Column, String, Float, DateTime, Integer, Index
from sqlalchemy.orm import relationship

from app.core.database import Base


class Cliente(Base):
    __tablename__ = "dim_cliente"

    id_cliente             = Column(String, primary_key=True, index=True)
    nome_cliente           = Column(String, nullable=False)
    cidade                 = Column(String)
    estado                 = Column(String)
    regiao                 = Column(String)
    qtd_pedidos_realizados = Column(Integer, default=0)
    total_gasto_brl        = Column(Float, default=0.0)
    qtd_tickets_suporte    = Column(Integer, default=0)
    data_ultima_compra     = Column(DateTime, nullable=True)
    media_estrelas_dadas   = Column(Float, nullable=True)
    segmento_rfm           = Column(String, nullable=True, index=True)

    tickets = relationship("Ticket", back_populates="cliente", lazy="select")
    pedidos = relationship("Pedido", back_populates="cliente", lazy="select")

    __table_args__ = (
        Index("ix_dim_cliente_segmento_id", "segmento_rfm", "id_cliente"),
    )
