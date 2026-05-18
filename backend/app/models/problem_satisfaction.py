from sqlalchemy import Column, String, Integer, Float
 
from app.core.database import Base
 
 
class SatisfacaoProblema(Base):
    __tablename__ = "gold_satisfacao_problema"
 
    tipo_problema                = Column(String, primary_key=True, index=True)
    volume_tickets               = Column(Integer, nullable=False)
    nota_media_satisfacao        = Column(Float, nullable=True)
    tempo_medio_resolucao_horas  = Column(Float, nullable=True)
 