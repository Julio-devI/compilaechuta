from sqlalchemy import Column, String, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Pedido(Base):
    __tablename__ = "fato_vendas"

    id_pedido         = Column(String, primary_key=True, index=True)
    id_cliente        = Column(String, ForeignKey("dim_cliente.id_cliente"), nullable=False, index=True)
    id_produto        = Column(String, nullable=False, index=True)
    id_data           = Column(String, nullable=True)
    quantidade_vendas = Column(Integer, nullable=True)
    valor_unitario    = Column(Float, nullable=True)
    valor_total_venda = Column(Float, nullable=True)
    status            = Column(String, nullable=True)
    metodo_pagamento  = Column(String, nullable=True)

    cliente = relationship("Cliente", back_populates="pedidos")