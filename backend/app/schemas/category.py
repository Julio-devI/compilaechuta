from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class CategoryBase(BaseModel):
    nome_categoria: str = Field(..., max_length=100, description="Nome da categoria")
    imagem_url: Optional[str] = Field(None, description="URL da imagem representativa da categoria")

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    nome_categoria: Optional[str] = Field(None, max_length=100)
    imagem_url: Optional[str] = None

class CategoryResponse(CategoryBase):
    id_categoria: str
    
    total_estoque_disponivel: Optional[int] = 0
    total_produtos_ativos: Optional[int] = 0
    total_com_estoque: Optional[int] = 0
    preco_medio: Optional[float] = None
    preco_minimo: Optional[float] = None
    preco_maximo: Optional[float] = None
    peso_medio_kg: Optional[float] = None
    total_precisa_revisao: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
