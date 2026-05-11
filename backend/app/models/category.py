from sqlalchemy import Column, Integer, String, Float, event, text
from app.core.database import Base

class Categoria(Base):
    __tablename__ = "gold_categoria"

    id_categoria = Column(String, primary_key=True, index=True)
    nome_categoria = Column(String, nullable=False)
    imagem_url = Column(String, nullable=True)
    total_produtos = Column(Integer, default=0)
    total_produtos_ativos = Column(Integer, default=0)
    total_com_estoque = Column(Integer, default=0)
    preco_medio = Column(Float, default=0.0)
    preco_minimo = Column(Float, default=0.0)
    preco_maximo = Column(Float, default=0.0)
    peso_medio_kg = Column(Float, default=0.0)
    total_precisa_revisao = Column(Integer, default=0)