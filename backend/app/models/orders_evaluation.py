from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base

class AvaliacaoPedido(Base):
    __tablename__ = "fato_avaliacoes_pedido"

    id_avaliacao = Column(String, primary_key=True, index=True)
    id_pedido = Column(String, ForeignKey("fato_vendas.id_pedido"), nullable=False, index=True)
    id_cliente = Column(String, ForeignKey("dim_cliente.id_cliente"), nullable=False, index=True)
    id_produto = Column(String, ForeignKey("dim_produto.id_produto"), nullable=False, index=True)

    nota_produto = Column(Float, nullable=True)
    categoria = Column(String, nullable=True)
    preco = Column(Float, nullable=True)
    valor_pedido = Column(Float, nullable=True)
    quantidade = Column(Float, nullable=True)
    metodo_pagamento = Column(String, nullable=True)
    status = Column(String, nullable=True)
    data_pedido = Column(DateTime, nullable=True)
    nota_nps = Column(Float, nullable=True)
    recomenda = Column(Boolean, nullable=True)
    comentario = Column(String, nullable=True)
    data_avaliacao = Column(DateTime, nullable=True)
    categoria_nps = Column(String, nullable=True)
    pct_recomendacoes_sim = Column(Float, nullable=True)