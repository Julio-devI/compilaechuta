from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    # Identificação
    id_cliente             = Column(String, primary_key=True, index=True)
    nome_cliente           = Column(String, nullable=False)

    # Localização
    cidade                 = Column(String)
    estado                 = Column(String)
    regiao                 = Column(String)

    # Métricas de negócio (vindas da camada Gold — dim_cliente)
    qtd_pedidos_realizados = Column(Integer, default=0)
    total_gasto_brl        = Column(Float, default=0.0)
    qtd_tickets_suporte    = Column(Integer, default=0)
    data_ultima_compra     = Column(DateTime, nullable=True)
    media_estrelas_dadas   = Column(Float, nullable=True)
    segmento_rfm           = Column(String, nullable=True)

    tickets = relationship("Ticket", back_populates="cliente", lazy="selectin")