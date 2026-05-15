from sqlalchemy import Column, Integer, String, Text, DateTime, func

from app.core.database import Base


class AIAgentSession(Base):
    __tablename__ = "ai_agent_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, nullable=False, index=True)
    history_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
