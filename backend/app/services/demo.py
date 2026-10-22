"""Демо-инструменты: воспроизвести нехватку мест и вернуть мероприятие в исходное состояние."""

from sqlalchemy import case, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Event, Order, Participant
from app.services.events import get_event


async def take_seats(session: AsyncSession, count: int) -> Event:
    """Занимает места как другой покупатель; если свободно меньше — занимает все оставшиеся."""
    event = await get_event(session)
    await session.execute(
        update(Event)
        .where(Event.id == event.id)
        .values(
            # Остаток не уходит в минус: «больше, чем свободно» означает «все оставшиеся»
            seats_available=case(
                (Event.seats_available > count, Event.seats_available - count), else_=0
            )
        )
        .execution_options(synchronize_session=False)
    )
    await session.commit()
    await session.refresh(event)
    return event


async def reset(session: AsyncSession) -> Event:
    """Все места свободны, оформленные заказы удалены."""
    event = await get_event(session)
    await session.execute(delete(Participant))
    await session.execute(delete(Order))
    await session.execute(
        update(Event)
        .where(Event.id == event.id)
        .values(seats_available=Event.total_seats)
        .execution_options(synchronize_session=False)
    )
    await session.commit()
    await session.refresh(event)
    return event
