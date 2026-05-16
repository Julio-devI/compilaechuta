from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ClickstreamResponse(BaseModel):
    id_cliente: str
    total_sessoes: Optional[int] = None
    total_eventos: Optional[int] = None
    data_ultima_sessao: Optional[datetime] = None
    qtd_visualizacao_produto: Optional[int] = None
    qtd_adicoes_carrinho: Optional[int] = None
    qtd_abandonos_carrinho: Optional[int] = None
    qtd_compras: Optional[int] = None
    canal_mais_usado: Optional[str] = None
    dispositivo_mais_usado: Optional[str] = None
    timestamp_ingestion_gold: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ClickstreamListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    data: list[ClickstreamResponse]