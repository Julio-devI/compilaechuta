from sqlalchemy import Column, Integer, String, DateTime
from app.core.database import Base

class Clickstream(Base):

    __tablename__ = "fato_clickstream_navegacao"

    id_cliente = Column(String, primary_key=True)
    total_sessoes = Column(Integer)
    total_eventos = Column(Integer)
    data_ultima_sessao = Column(DateTime)
    qtd_visualizacao_produto = Column(Integer)
    qtd_adicoes_carrinho = Column(Integer)
    qtd_abandonos_carrinho = Column(Integer)
    qtd_compras = Column(Integer)
    canal_mais_usado = Column(String)
    dispositivo_mais_usado = Column(String)
