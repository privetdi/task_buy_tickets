from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Event
from app.errors import EventNotFoundError


async def get_event(session: AsyncSession) -> Event:
    """Единственное мероприятие приложения."""
    event = await session.scalar(select(Event).order_by(Event.id).limit(1))
    if event is None:
        raise EventNotFoundError("Мероприятие не найдено")
    return event
