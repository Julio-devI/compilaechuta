from sqlalchemy import Column, Integer, String, Float, Boolean, Date
from app.core.database import Base

class Produto(Base):
    __tablename__ = "dim_produto"

    id_produto = Column(Integer, primary_key=True, index=True)
    nome_produto = Column(String, nullable=False)
    fornecedor = Column(String, nullable=True)
    data_cadastro_produto = Column(Date, nullable=True)
    preco = Column(Float, nullable=True)
    categoria = Column(String, nullable=True)
    ativo = Column(Boolean, default=True)
    peso_kg = Column(Float, nullable=True)
    estoque_disponivel = Column(Integer, default=0)
    tem_estoque = Column(Boolean, default=False)
    precisa_revisao = Column(Boolean, default=False)
    qtd_total_vendas = Column(Integer, default=0)
    receita_total = Column(Float, default=0.0)
    qtd_tickets_gerados = Column(Integer, default=0)
    nota_media_produto = Column(Float, nullable=True)
    pct_recomendacoes_sim = Column(Float, nullable=True)
