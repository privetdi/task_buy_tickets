from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator


class UTCDateTime(TypeDecorator[datetime]):
    """Дата-время, которое всегда возвращается с часовым поясом UTC.

    SQLite не хранит часовой пояс и отдаёт «наивные» значения; тип возвращает им UTC,
    чтобы поведение не зависело от СУБД.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        return value.astimezone(UTC) if value is not None else None

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class Base(DeclarativeBase):
    pass


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (
        # Страховка на уровне БД: остаток никогда не уходит в минус и не превышает вместимость
        CheckConstraint("seats_available >= 0 AND seats_available <= total_seats"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    starts_at: Mapped[datetime] = mapped_column(UTCDateTime)
    venue: Mapped[str] = mapped_column(String(200))
    total_seats: Mapped[int]
    seats_available: Mapped[int]


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"))
    email: Mapped[str] = mapped_column(String(254))
    total: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=lambda: datetime.now(UTC))

    participants: Mapped[list["Participant"]] = relationship(
        back_populates="order",
        order_by="Participant.position",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    position: Mapped[int]
    name: Mapped[str] = mapped_column(String(100))
    age: Mapped[int]
    # Тип и цена фиксируются на момент заказа: потом тарифы могут измениться
    ticket_type: Mapped[str] = mapped_column(String(16))
    price: Mapped[int]

    order: Mapped[Order] = relationship(back_populates="participants")
