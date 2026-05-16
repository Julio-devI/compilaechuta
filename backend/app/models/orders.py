from sqlalchemy import Column, String, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Pedido(Base):
    __tablename__ = "fato_vendas"

    id_pedido          = Column(String, primary_key=True, index=True)
    id_cliente         = Column(String, ForeignKey("dim_cliente.id_cliente"), nullable=False, index=True)
    id_produto         = Column(String, ForeignKey("dim_produto.id_produto"), nullable=False, index=True)
    id_pedido_display  = Column(String, nullable=False, unique=True, index=True)
    id_data = Column(String, nullable=True, index=True)
    quantidade_vendas  = Column(Integer, nullable=True)
    valor_unitario     = Column(Float, nullable=True)
    valor_total_venda  = Column(Float, nullable=True)
    status             = Column(String, nullable=True, index=True)
    metodo_pagamento   = Column(String, nullable=True)

    # selectin para produto pois a API precisa do nome_produto (evita N+1 query)
    produto = relationship("Produto", back_populates="pedido", lazy="selectin")
    
    # lazy="select" para evitar queries extras desnecessárias já que a API não retorna tickets/clientes na listagem base
    tickets = relationship("Ticket", back_populates="pedido", lazy="select")
    cliente = relationship("Cliente", back_populates="pedidos", lazy="select")

    @property
    def nome_produto(self):
        return self.produto.nome_produto if self.produto else None