from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, event, text
from datetime import datetime
from app.core.database import Base
from sqlalchemy.orm import relationship

class Produto(Base):
    __tablename__ = "dim_produto"

    id_produto = Column(String, primary_key=True, index=True)
    sku = Column(String, nullable=False)
    nome_produto = Column(String, nullable=False)
    id_categoria = Column(String, nullable=True, index=True)
    fornecedor = Column(String, nullable=True)
    preco = Column(Float, nullable=True)
    peso_kg = Column(Float, nullable=True)
    estoque_disponivel = Column(Integer, default=0)
    ativo = Column(Boolean, default=True)
    precisa_revisao = Column(Boolean, default=False)
    data_cadastro_produto = Column(DateTime, default=datetime.utcnow)
    total_pedidos = Column(Integer, default=0)
    receita_total = Column(Float, default=0.0)
    ticket_medio = Column(Float, default=0.0)
    total_unidades_vendidas = Column(Integer, default=0)
    total_avaliacoes = Column(Integer, default=0)
    media_nota_produto = Column(Float, nullable=True)
    media_nota_nps = Column(Float, nullable=True)
    pct_recomendacoes_sim = Column(Float, nullable=True)
    media_tempo_resolucao_horas = Column(Float, nullable=True)
    media_nota_suporte = Column(Float, nullable=True)
    total_tickets = Column(Integer, default=0)

    pedido = relationship("Pedido", back_populates="produto")
