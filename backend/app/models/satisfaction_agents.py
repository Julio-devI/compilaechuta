from sqlalchemy import Column, String, Integer, Float
 
from app.core.database import Base
 
 
class AgenteSatisfacao(Base):
    __tablename__ = "gold_satisfacao_agente"
 
    agente_suporte           = Column(String, primary_key=True, index=True)
    qtd_tickets_resolvidos   = Column(Integer, nullable=False)
    nota_media_satisfacao    = Column(Float, nullable=True)
    tempo_medio_resolucao    = Column(Float, nullable=True)