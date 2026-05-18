from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
 
 
class SatisfacaoProblemaBase(BaseModel):
    tipo_problema:               str
    volume_tickets:              int
    nota_media_satisfacao:       Optional[float] = None
    tempo_medio_resolucao_horas: Optional[float] = None
 
    model_config = ConfigDict(from_attributes=True)
 
 
class SatisfacaoProblemaOut(SatisfacaoProblemaBase):
    @field_validator("nota_media_satisfacao", mode="before")
    @classmethod
    def tratar_nota(cls, v):
        if v is not None and v < 0:
            return None
        return v
 
    @field_validator("tempo_medio_resolucao_horas", mode="before")
    @classmethod
    def tratar_tempo(cls, v):
        if v is not None and v < 0:
            return None
        return v
 
 
class SatisfacaoProblemaListOut(BaseModel):
    total: int
    skip:  int
    limit: int
    data:  list[SatisfacaoProblemaOut]