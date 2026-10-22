from collections.abc import Iterable
from enum import StrEnum

from app.domain.rules import CHILD_PRICE, FULL_PRICE, FULL_TICKET_MIN_AGE


class TicketType(StrEnum):
    FULL = "full"
    CHILD = "child"


_PRICES: dict[TicketType, int] = {
    TicketType.FULL: FULL_PRICE,
    TicketType.CHILD: CHILD_PRICE,
}


def ticket_type_for(age: int) -> TicketType:
    """Тип билета по возрасту: младше границы — детский, иначе полный."""
    return TicketType.CHILD if age < FULL_TICKET_MIN_AGE else TicketType.FULL


def price_for(ticket_type: TicketType) -> int:
    return _PRICES[ticket_type]


def calculate_total(ages: Iterable[int]) -> int:
    """Итог заказа — сумма цен билетов всех участников."""
    return sum(price_for(ticket_type_for(age)) for age in ages)
