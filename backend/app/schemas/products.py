from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ProductBase(BaseModel):
    nome_produto: str = Field(..., max_length=100)
    fornecedor: str = Field(..., max_length=100)
    preco: float = Field(..., gt=0)
    categoria: str = Field(..., max_length=100)
    ativo: bool = True
    peso_kg: Optional[float] = Field(None, gt=0)

class ProductCreate(ProductBase):
    estoque_disponivel: int = 0

class ProductUpdate(BaseModel):
    nome_produto: Optional[str] = Field(None, max_length=100)
    fornecedor: Optional[str] = Field(None, max_length=100)
    preco: Optional[float] = Field(None, gt=0)
    categoria: Optional[str] = Field(None, max_length=100)
    ativo: Optional[bool] = None
    peso_kg: Optional[float] = Field(None, gt=0)

class ProductResponse(ProductBase):
    id_produto: int
    data_cadastro_produto: datetime

    estoque_disponivel: int
    tem_estoque: bool
    precisa_revisao: bool

    qtd_total_vendas: int
    receita_total: float
    qtd_tickets_gerados: int

    nota_media_produto: Optional[float]
    pct_recomendacoes_sim: Optional[float]

    model_config = ConfigDict(from_attributes=True)