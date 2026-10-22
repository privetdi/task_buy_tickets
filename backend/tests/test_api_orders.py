from typing import Any

import pytest
from fastapi import FastAPI
from httpx import AsyncClient, Response
from sqlalchemy import func, select

from app.db.models import Order

EMAIL = "buyer@mail.ru"


def participant(name: str = "Иван", age: Any = 30) -> dict[str, Any]:
    return {"name": name, "age": age}


def adults(count: int) -> list[dict[str, Any]]:
    return [participant(f"Взрослый {i}", 30) for i in range(count)]


async def post_order(
    client: AsyncClient, participants: list[dict[str, Any]], **extra: Any
) -> Response:
    return await client.post(
        "/api/orders", json={"email": EMAIL, "participants": participants, **extra}
    )


async def seats_available(client: AsyncClient) -> int:
    return (await client.get("/api/event")).json()["seats_available"]


async def orders_count(app: FastAPI) -> int:
    async with app.state.session_factory() as session:
        return await session.scalar(select(func.count()).select_from(Order))


# --- Успешное оформление ---


async def test_create_order_computes_total_on_server(client: AsyncClient) -> None:
    response = await post_order(
        client, [participant("Анна", 35), participant("Пётр", 33), participant("Маша", 8)]
    )

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body["email"] == EMAIL
    assert body["total"] == 5000
    assert body["participants"] == [
        {"name": "Анна", "age": 35, "ticket_type": "full", "price": 2000},
        {"name": "Пётр", "age": 33, "ticket_type": "full", "price": 2000},
        {"name": "Маша", "age": 8, "ticket_type": "child", "price": 1000},
    ]
    assert body["created_at"]


async def test_client_total_is_ignored(client: AsyncClient) -> None:
    response = await post_order(client, [participant("Анна", 35)], total=1, price=1)

    assert response.status_code == 201
    assert response.json()["total"] == 2000


async def test_name_is_trimmed(client: AsyncClient) -> None:
    response = await post_order(client, [participant("  Анна  ", 35)])

    assert response.json()["participants"][0]["name"] == "Анна"


async def test_order_consumes_one_seat_per_participant(client: AsyncClient) -> None:
    await post_order(
        client, [participant("Анна", 35), participant("Маша", 8), participant("Оля", 5)]
    )

    assert await seats_available(client) == 7


# --- Валидация полей ---


@pytest.mark.parametrize(
    ("participants", "field"),
    [
        ([participant("", 30)], "participants.0.name"),
        ([participant("   ", 30)], "participants.0.name"),
        ([participant("x" * 101, 30)], "participants.0.name"),
        ([{"name": "Иван"}], "participants.0.age"),
        ([participant("Иван", None)], "participants.0.age"),
        ([participant("Иван", -1)], "participants.0.age"),
        ([participant("Иван", 121)], "participants.0.age"),
        ([participant("Иван", 12.5)], "participants.0.age"),
        ([participant("Иван", "30")], "participants.0.age"),
        # ошибка в втором участнике указывает на его номер
        ([participant("Иван", 30), participant("", 30)], "participants.1.name"),
        ([], "participants"),
        (adults(5), "participants"),
    ],
)
async def test_invalid_participants_return_field_path(
    client: AsyncClient, participants: list[dict[str, Any]], field: str
) -> None:
    response = await post_order(client, participants)

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert field in [item["field"] for item in body["fields"]]
    assert await seats_available(client) == 10


@pytest.mark.parametrize("email", ["", "not-an-email", "a@b", "user@", "@mail.ru"])
async def test_invalid_email_returns_email_field(client: AsyncClient, email: str) -> None:
    response = await client.post("/api/orders", json={"email": email, "participants": adults(1)})

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert "email" in [item["field"] for item in body["fields"]]


async def test_missing_email_returns_email_field(client: AsyncClient) -> None:
    response = await client.post("/api/orders", json={"participants": adults(1)})

    assert response.status_code == 422
    assert "email" in [item["field"] for item in response.json()["fields"]]


async def test_four_participants_is_allowed(client: AsyncClient) -> None:
    response = await post_order(client, adults(4))

    assert response.status_code == 201
    assert response.json()["total"] == 8000


# --- Правило сопровождения ---


@pytest.mark.parametrize("ages", [[10], [10, 17], [5, 13, 16]])
async def test_child_without_adult_is_rejected(client: AsyncClient, ages: list[int]) -> None:
    response = await post_order(client, [participant(f"У{i}", age) for i, age in enumerate(ages)])

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "child_requires_adult"
    # Это ошибка правила состава, а не отдельного поля
    assert "fields" not in body
    assert await seats_available(client) == 10


@pytest.mark.parametrize("ages", [[10, 18], [3, 5, 9, 40], [14], [14, 17]])
async def test_valid_group_composition_is_accepted(client: AsyncClient, ages: list[int]) -> None:
    response = await post_order(client, [participant(f"У{i}", age) for i, age in enumerate(ages)])

    assert response.status_code == 201


# --- Нехватка мест ---


async def test_not_enough_seats_rejects_whole_order(client: AsyncClient, app: FastAPI) -> None:
    # Остаётся 2 места
    assert (await post_order(client, adults(4))).status_code == 201
    assert (await post_order(client, adults(4))).status_code == 201
    assert await seats_available(client) == 2

    response = await post_order(client, adults(3))

    assert response.status_code == 409
    body = response.json()
    assert body["code"] == "not_enough_seats"
    assert body["seats_available"] == 2
    # Заказ не сохранён, счётчик не изменился
    assert await seats_available(client) == 2
    assert await orders_count(app) == 2


async def test_order_exactly_for_remaining_seats(client: AsyncClient) -> None:
    assert (await post_order(client, adults(4))).status_code == 201
    assert (await post_order(client, adults(3))).status_code == 201
    assert await seats_available(client) == 3

    response = await post_order(client, adults(3))

    assert response.status_code == 201
    assert await seats_available(client) == 0


async def test_sold_out_rejects_any_order(client: AsyncClient) -> None:
    for size in (4, 4, 2):
        assert (await post_order(client, adults(size))).status_code == 201
    assert await seats_available(client) == 0

    response = await post_order(client, adults(1))

    assert response.status_code == 409
    assert response.json()["seats_available"] == 0
