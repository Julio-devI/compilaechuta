from sqlalchemy import Column, String, Integer, Float, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.core.database import Base


class Pedido(Base):
    __tablename__ = "fato_vendas"

    id_pedido          = Column(String, primary_key=True, index=True)
    id_cliente         = Column(String, ForeignKey("dim_cliente.id_cliente"), nullable=False, index=True)
    id_produto         = Column(String, ForeignKey("dim_produto.id_produto", ondelete="SET NULL"), index=True)
    id_pedido_display  = Column(String, nullable=False, unique=True, index=True)
    id_data            = Column(String, nullable=True, index=True)
    quantidade_vendas  = Column(Integer, nullable=True)
    valor_unitario     = Column(Float, nullable=True)
    valor_total_venda  = Column(Float, nullable=True)
    status             = Column(String, nullable=True, index=True)
    metodo_pagamento   = Column(String, nullable=True)

    # selectin para produto pois a API precisa do nome_produto (evita N+1 query)
    produto = relationship("Produto", back_populates="pedido", lazy="selectin")
    
    # lazy="select" para evitar queries extras desnecessárias já que a API não retorna tickets/clientes na listagem base
    tickets = relationship("Ticket", back_populates="pedido", lazy="select")
    
    # Mudado para selectin para carregar cliente com pedido
    cliente = relationship("Cliente", back_populates="pedidos", lazy="selectin")

    __table_args__ = (
        Index("ix_fato_vendas_id_cliente_id_pedido", "id_cliente", "id_pedido"),
        Index("ix_fato_vendas_status_id_pedido", "status", "id_pedido"),
    )

    @property
    def nome_produto(self):
        return self.produto.nome_produto if self.produto else None

    @property
    def nome_cliente(self):
        return self.cliente.nome_cliente if self.cliente else None
        
    @property
    def cidade_cliente(self):
        return self.cliente.cidade if self.cliente else None
        
    @property
    def estado_cliente(self):
        return self.cliente.estado if self.cliente else None
        
    @property
    def segmento_cliente(self):
        return self.cliente.segmento_rfm if self.cliente else None
        
    @property
    def qtd_tickets_cliente(self):
        return self.cliente.qtd_tickets_suporte if self.cliente else None
        
    @property
    def media_estrelas_cliente(self):
        return self.cliente.media_estrelas_dadas if self.cliente else None
        
    @property
    def qtd_pedidos_cliente(self):
        return self.cliente.qtd_pedidos_realizados if self.cliente else None