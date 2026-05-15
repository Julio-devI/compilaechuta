from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ProductBase(BaseModel):
    nome_produto: str = Field(..., max_length=100)
    sku: Optional[str] = Field(None, max_length=100)
    categoria: Optional[str] = Field(None, max_length=100)
    fornecedor: Optional[str] = Field(None, max_length=100)
    preco: Optional[float] = None
    peso_kg: Optional[float] = None
    estoque_disponivel: Optional[int] = 0
    ativo: Optional[str] = "Sim"
    precisa_revisao: Optional[str] = "Não"
    descricao: Optional[str] = None

class ProductCreate(ProductBase):
    id_produto: str = Field(..., description="ID manual do produto (ex: PROD-0001)")

class ProductUpdate(BaseModel):
    nome_produto: Optional[str] = Field(None, max_length=100)
    categoria: Optional[str] = Field(None, max_length=100)
    fornecedor: Optional[str] = Field(None, max_length=100)
    preco: Optional[float] = Field(None, gt=0)
    peso_kg: Optional[float] = Field(None, gt=0)
    estoque_disponivel: Optional[int] = Field(None, ge=0)
    ativo: Optional[str] = None  # "Sim" ou "Não"
    descricao: Optional[str] = None

class ProductResponse(ProductBase):
    id_produto: str
    data_cadastro_produto: Optional[datetime] = None
    
    total_pedidos: Optional[int] = 0
    receita_total: Optional[float] = 0.0
    ticket_medio: Optional[float] = 0.0
    total_unidades_vendidas: Optional[int] = 0
    total_avaliacoes: Optional[int] = 0
    media_nota_produto: Optional[float] = None
    media_nota_nps: Optional[float] = None
    pct_recomendacoes_sim: Optional[float] = None
    total_tickets: Optional[int] = 0
    media_tempo_resolucao_horas: Optional[float] = None
    media_nota_suporte: Optional[float] = None
    timestamp_ingestion_gold: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)