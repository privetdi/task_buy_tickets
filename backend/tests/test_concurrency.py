"""Гонка за последние места: условный UPDATE не должен допускать перепродажи.

Тесты идут на файловой SQLite с несколькими соединениями, поэтому запросы выполняются
действительно конкурентно, а не по очереди.
"""

import asyncio

import pytest
from fastapi import FastAPI
from httpx import AsyncClient, Response
from sqlalchemy import func, select

from app.config import Settings
from app.db.models import Event, Order, Participant

TOTAL_SEATS = 3


@pytest.fixture
def settings(database_url: str) -> Settings:
    return Settings(
        _env_file=None, database_url=database_url, demo_mode=True, event_total_seats=TOTAL_SEATS
    )


def order_of(size: int) -> dict:
    participants = [{"name": f"Гость {i}", "age": 30} for i in range(size)]
    return {"email": "buyer@mail.ru", "participants": participants}


async def place_orders(client: AsyncClient, sizes: list[int]) -> list[Response]:
    return await asyncio.gather(
        *(client.post("/api/orders", json=order_of(size)) for size in sizes)
    )


async def read_state(app: FastAPI) -> tuple[int, int, int]:
    """Остаток мест, число заказов и число проданных мест (участников)."""
    async with app.state.session_factory() as session:
        seats_left = await session.scalar(select(Event.seats_available))
        orders = await session.scalar(select(func.count()).select_from(Order))
        sold = await session.scalar(select(func.count()).select_from(Participant))
    return seats_left, orders, sold


async def test_two_concurrent_orders_for_last_seats(client: AsyncClient, app: FastAPI) -> None:
    responses = await place_orders(client, [2, 2])

    statuses = sorted(response.status_code for response in responses)
    assert statuses == [201, 409]
    rejected = next(r for r in responses if r.status_code == 409).json()
    assert rejected["code"] == "not_enough_seats"
    # Отказ возможен только после того, как первый заказ уже списал свои места
    assert rejected["seats_available"] == 1

    seats_left, orders, sold = await read_state(app)
    assert (seats_left, orders, sold) == (1, 1, 2)


async def test_many_concurrent_orders_never_oversell(client: AsyncClient, app: FastAPI) -> None:
    responses = await place_orders(client, [1] * 10)

    accepted = [r for r in responses if r.status_code == 201]
    rejected = [r for r in responses if r.status_code == 409]
    assert len(accepted) == TOTAL_SEATS
    assert len(rejected) == 10 - TOTAL_SEATS

    seats_left, orders, sold = await read_state(app)
    assert (seats_left, orders, sold) == (0, TOTAL_SEATS, TOTAL_SEATS)
