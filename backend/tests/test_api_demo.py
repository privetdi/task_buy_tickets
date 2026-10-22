from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.config import Settings
from app.db.models import Order
from app.main import create_app


async def seats_available(client: AsyncClient) -> int:
    return (await client.get("/api/event")).json()["seats_available"]


async def place_order(client: AsyncClient, size: int) -> int:
    participants = [{"name": f"Гость {i}", "age": 30} for i in range(size)]
    response = await client.post(
        "/api/orders", json={"email": "buyer@mail.ru", "participants": participants}
    )
    return response.status_code


async def test_take_seats_reduces_remaining(client: AsyncClient) -> None:
    response = await client.post("/api/demo/take-seats", json={"count": 4})

    assert response.status_code == 200
    assert response.json() == {"seats_available": 6, "total_seats": 10}
    assert await seats_available(client) == 6


async def test_take_more_than_available_takes_all_remaining(client: AsyncClient) -> None:
    await client.post("/api/demo/take-seats", json={"count": 7})

    response = await client.post("/api/demo/take-seats", json={"count": 50})

    assert response.json()["seats_available"] == 0
    assert await seats_available(client) == 0


@pytest.mark.parametrize("count", [0, -1, "3", 1.5])
async def test_take_seats_rejects_invalid_count(client: AsyncClient, count: object) -> None:
    response = await client.post("/api/demo/take-seats", json={"count": count})

    assert response.status_code == 422
    assert await seats_available(client) == 10


async def test_order_after_demo_takes_all_seats_is_rejected(client: AsyncClient) -> None:
    await client.post("/api/demo/take-seats", json={"count": 10})

    assert await place_order(client, 1) == 409


async def test_reset_restores_seats_and_removes_orders(client: AsyncClient, app) -> None:
    assert await place_order(client, 3) == 201
    await client.post("/api/demo/take-seats", json={"count": 50})
    assert await seats_available(client) == 0

    response = await client.post("/api/demo/reset")

    assert response.status_code == 200
    assert response.json() == {"seats_available": 10, "total_seats": 10}
    assert await seats_available(client) == 10
    async with app.state.session_factory() as session:
        assert await session.scalar(select(func.count()).select_from(Order)) == 0
    # После сброса снова можно покупать
    assert await place_order(client, 4) == 201


@pytest.fixture
async def client_demo_off(database_url: str) -> AsyncIterator[AsyncClient]:
    settings = Settings(
        _env_file=None, database_url=database_url, demo_mode=False, event_total_seats=10
    )
    app = create_app(settings)
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client


async def test_demo_endpoints_are_absent_when_demo_mode_is_off(
    client_demo_off: AsyncClient,
) -> None:
    take = await client_demo_off.post("/api/demo/take-seats", json={"count": 1})
    reset = await client_demo_off.post("/api/demo/reset")

    assert take.status_code == 404
    assert reset.status_code == 404
    event = (await client_demo_off.get("/api/event")).json()
    assert event["demo_mode"] is False
    assert event["seats_available"] == 10
