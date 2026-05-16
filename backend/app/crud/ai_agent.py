from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.ai_agent import AIAgentSession


async def get_session_by_session_id(
    db: AsyncSession, session_id: str
) -> AIAgentSession | None:
    result = await db.execute(
        select(AIAgentSession).where(AIAgentSession.session_id == session_id)
    )
    return result.scalars().first()


async def create_or_update_session(
    db: AsyncSession, session_id: str, history_json: str
) -> AIAgentSession:
    existing = await get_session_by_session_id(db, session_id)
    if existing:
        existing.history_json = history_json
        await db.commit()
        await db.refresh(existing)
        return existing

    new_session = AIAgentSession(session_id=session_id, history_json=history_json)
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session
