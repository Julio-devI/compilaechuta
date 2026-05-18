import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Operador(Base):
    __tablename__ = "gold_operador"

    id_operador = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    nome        = Column(String, nullable=False)
    username    = Column(String, nullable=False, unique=True, index=True)
    email       = Column(String, nullable=False, unique=True, index=True)
    telefone    = Column(String, nullable=True)
    role        = Column(String, nullable=False, default="user")  # super_admin | admin | user
    active          = Column(Boolean, nullable=False, default=True)
    two_fa_enabled  = Column(Boolean, nullable=False, default=False)
    senha_hash  = Column(String, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
