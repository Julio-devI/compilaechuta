from sqlalchemy import Column, ForeignKey, Integer, String, Float, Boolean, DateTime, event, text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from zoneinfo import ZoneInfo

class Tempo(Base):
    __tablename__ = "dim_tempo"

    id_data = Column(Integer, primary_key=True)
    ano = Column(Integer)
    mes = Column(Integer)
    dia = Column(Integer)
    trimestre = Column(Integer)
    dia_semana_num = Column(Integer)
    dia_do_ano = Column(Integer)
    semana_do_ano = Column(Integer)
    nome_mes = Column(String(50))
    nome_dia_semana = Column(String(50))
    ano_mes = Column(String(7))
    trismestre_label = Column(String(10))
    fim_de_semana = Column(Boolean)