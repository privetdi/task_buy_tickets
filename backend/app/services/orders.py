from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Event, Order, Participant
from app.domain.composition import escort_rule_violated
from app.domain.pricing import calculate_total, price_for, ticket_type_for
from app.domain.rules import ADULT_MIN_AGE
from app.errors import ChildRequiresAdultError, NotEnoughSeatsError
from app.schemas import OrderCreate
from app.services.events import get_event


async def create_order(session: AsyncSession, data: OrderCreate) -> Order:
    """Создаёт заказ: проверяет правила, списывает места, сохраняет заказ.

    Всё или ничего: если мест не хватает, заказ не сохраняется и места не списываются.
    """
    ages = [participant.age for participant in data.participants]

    # Чистая проверка правил — до любых обращений к БД на запись
    if escort_rule_violated(ages):
        raise ChildRequiresAdultError(
            f"Ребёнок допускается только вместе с участником от {ADULT_MIN_AGE} лет"
        )

    event = await get_event(session)
    seats_needed = len(ages)

    # Списание мест — одним условным UPDATE. Условие `seats_available >= n` проверяется и
    # применяется атомарно на уровне БД, поэтому два конкурирующих заказа не «перепродадут» место.
    # Это первая запись в транзакции: блокировка берётся сразу, без повышения уровня.
    reserved = await session.execute(
        update(Event)
        .where(Event.id == event.id, Event.seats_available >= seats_needed)
        .values(seats_available=Event.seats_available - seats_needed)
        .execution_options(synchronize_session=False)
    )
    if reserved.rowcount == 0:
        seats_left = await session.scalar(select(Event.seats_available).where(Event.id == event.id))
        await session.rollback()
        raise NotEnoughSeatsError(
            f"Недостаточно свободных мест: осталось {seats_left}", seats_available=seats_left or 0
        )

    participants = []
    for position, participant in enumerate(data.participants):
        ticket_type = ticket_type_for(participant.age)
        participants.append(
            Participant(
                position=position,
                name=participant.name,
                age=participant.age,
                ticket_type=ticket_type.value,
                price=price_for(ticket_type),
            )
        )

    # Сумму всегда считает сервер по составу участников
    order = Order(
        event_id=event.id,
        email=data.email,
        total=calculate_total(ages),
        participants=participants,
    )
    session.add(order)
    await session.commit()
    return order
