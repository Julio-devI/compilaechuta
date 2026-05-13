from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ProductBase(BaseModel):
    nome_produto: str = Field(..., max_length=100)
    categoria: str = Field(..., max_length=100)
    fornecedor: str = Field(..., max_length=100)
    preco: float = Field(..., gt=0)
    peso_kg: Optional[float] = Field(None, gt=0)
    estoque_disponivel: int = Field(0, ge=0)
    ativo: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    nome_produto: Optional[str] = Field(None, max_length=100)
    nome_produto: Optional[str] = Field(None, max_length=100)
    nome_produto: Optional[str] = Field(None, max_length=100)
    nome_produto: Optional[str] = Field(None, max_length=100)
    categoria: Optional[str] = Field(None, max_length=100)
    fornecedor: Optional[str] = Field(None, max_length=100)
    preco: Optional[float] = Field(None, gt=0)
    peso_kg: Optional[float] = Field(None, gt=0)
    estoque_disponivel: Optional[int] = Field(None, ge=0)
    ativo: Optional[bool] = None

class ProductResponse(ProductBase):
    id_produto: str
    data_cadastro_produto: datetime
    precisa_revisao: bool
    
    total_pedidos: Optional[int] = 0
    receita_total: Optional[float] = 0.0
    ticket_medio: Optional[float] = 0.0
    total_unidades_vendidas: Optional[int] = 0
    total_avaliacoes: Optional[int] = 0
    media_nota_produto: Optional[float] = None
    media_nota_nps: Optional[float] = None
    pct_recomendacoes_sim: Optional[float] = None
    total_tickets: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)