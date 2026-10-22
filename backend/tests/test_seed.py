from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import Event
from app.db.seed import seed_event


async def test_seed_creates_event_on_empty_db(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await seed_event(session_factory, total_seats=10)

    async with session_factory() as session:
        events = (await session.scalars(select(Event))).all()

    assert len(events) == 1
    event = events[0]
    assert event.total_seats == 10
    assert event.seats_available == 10
    assert event.starts_at.tzinfo is not None
    assert event.starts_at > datetime.now(UTC)


async def test_seed_is_idempotent(session_factory: async_sessionmaker[AsyncSession]) -> None:
    await seed_event(session_factory, total_seats=10)
    await seed_event(session_factory, total_seats=99)

    async with session_factory() as session:
        count = await session.scalar(select(func.count()).select_from(Event))
        total = await session.scalar(select(Event.total_seats))

    assert count == 1
    # Второй вызов не перезаписывает существующее мероприятие
    assert total == 10
