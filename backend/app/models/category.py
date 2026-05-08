from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Categoria(Base):
    __tablename__ = "dim_categoria"

    id_categoria = Column(Integer, primary_key=True, index=True)
    nome_categoria = Column(String, unique=True, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    descricao = Column(String, nullable=True)