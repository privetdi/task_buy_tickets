from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import Event

# Моковые данные мероприятия
EVENT_TITLE = "Городской фестиваль науки"
EVENT_VENUE = "Центральный выставочный зал, ул. Примерная, 1"
# Дата считается от момента первого запуска, чтобы пример не «протух»
EVENT_DAYS_AHEAD = 30
EVENT_START_HOUR_UTC = 16


async def seed_event(session_factory: async_sessionmaker[AsyncSession], total_seats: int) -> None:
    """Создаёт моковое мероприятие, если его ещё нет. Повторный вызов ничего не меняет."""
    async with session_factory() as session, session.begin():
        if await session.scalar(select(Event.id).limit(1)) is not None:
            return
        starts_at = (datetime.now(UTC) + timedelta(days=EVENT_DAYS_AHEAD)).replace(
            hour=EVENT_START_HOUR_UTC, minute=0, second=0, microsecond=0
        )
        session.add(
            Event(
                title=EVENT_TITLE,
                starts_at=starts_at,
                venue=EVENT_VENUE,
                total_seats=total_seats,
                seats_available=total_seats,
            )
        )
