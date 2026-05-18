from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
 
 
class AgenteSatisfacaoBase(BaseModel):
    agente_suporte:         str
    qtd_tickets_resolvidos: int
    nota_media_satisfacao:  Optional[float] = None
    tempo_medio_resolucao:  Optional[float] = None
 
    model_config = ConfigDict(from_attributes=True)
 
 
class AgenteSatisfacaoOut(AgenteSatisfacaoBase):
    @field_validator("nota_media_satisfacao", mode="before")
    @classmethod
    def tratar_nota(cls, v):
        if v is not None and v < 0:
            return None
        return v
 
    @field_validator("tempo_medio_resolucao", mode="before")
    @classmethod
    def tratar_tempo(cls, v):
        if v is not None and v < 0:
            return None
        return v
 
 
 
class AgenteSatisfacaoListOut(BaseModel):
    total: int
    skip:  int
    limit: int
    data:  list[AgenteSatisfacaoOut]