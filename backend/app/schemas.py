from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.domain import rules
from app.domain.pricing import TicketType

# --- Запросы ---


class ParticipantIn(BaseModel):
    name: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=rules.MAX_NAME_LENGTH),
    ]
    # strict: возраст — целое число; 12.5, "12" и true не принимаются
    age: Annotated[int, Field(strict=True, ge=rules.MIN_AGE, le=rules.MAX_AGE)]


class OrderCreate(BaseModel):
    """Тело запроса на создание заказа. Итоговой суммы здесь нет: её считает сервер."""

    email: EmailStr
    participants: Annotated[
        list[ParticipantIn],
        Field(min_length=rules.MIN_PARTICIPANTS, max_length=rules.MAX_PARTICIPANTS),
    ]


class TakeSeatsIn(BaseModel):
    """Демо: сколько мест занять «другим покупателем»."""

    count: Annotated[int, Field(strict=True, ge=1)]


# --- Ответы ---


class SeatsOut(BaseModel):
    seats_available: int
    total_seats: int


class PricesOut(BaseModel):
    full: int
    child: int


class RulesOut(BaseModel):
    """Правила продажи; клиент берёт их отсюда и своих констант не хранит."""

    min_participants: int
    max_participants: int
    min_age: int
    max_age: int
    max_name_length: int
    full_ticket_min_age: int
    escort_required_below_age: int
    adult_min_age: int
    prices: PricesOut

    @classmethod
    def current(cls) -> "RulesOut":
        return cls(
            min_participants=rules.MIN_PARTICIPANTS,
            max_participants=rules.MAX_PARTICIPANTS,
            min_age=rules.MIN_AGE,
            max_age=rules.MAX_AGE,
            max_name_length=rules.MAX_NAME_LENGTH,
            full_ticket_min_age=rules.FULL_TICKET_MIN_AGE,
            escort_required_below_age=rules.ESCORT_REQUIRED_BELOW_AGE,
            adult_min_age=rules.ADULT_MIN_AGE,
            prices=PricesOut(full=rules.FULL_PRICE, child=rules.CHILD_PRICE),
        )


class EventOut(BaseModel):
    id: int
    title: str
    starts_at: datetime
    venue: str
    total_seats: int
    seats_available: int
    rules: RulesOut
    demo_mode: bool


class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    age: int
    ticket_type: TicketType
    price: int


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    participants: list[ParticipantOut]
    total: int
    created_at: datetime
