from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, event, text
from datetime import datetime
from app.core.database import Base

class Produto(Base):
    __tablename__ = "dim_produto"

    id_produto = Column(String, primary_key=True, index=True)
    nome_produto = Column(String, nullable=False)
    categoria = Column(String, nullable=True)
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
    total_tickets = Column(Integer, default=0)