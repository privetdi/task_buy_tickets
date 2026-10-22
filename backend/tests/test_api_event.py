from httpx import AsyncClient

from app.domain import rules


async def test_health(client: AsyncClient) -> None:
    response = await client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_api_docs_are_served_under_api_prefix(client: AsyncClient) -> None:
    assert (await client.get("/api/docs")).status_code == 200
    assert (await client.get("/api/openapi.json")).status_code == 200


async def test_event_structure(client: AsyncClient) -> None:
    response = await client.get("/api/event")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "id",
        "title",
        "starts_at",
        "venue",
        "total_seats",
        "seats_available",
        "rules",
        "demo_mode",
    }
    assert body["total_seats"] == 10
    assert body["seats_available"] == 10
    assert body["demo_mode"] is True
    # Дата отдаётся с часовым поясом
    assert body["starts_at"].endswith(("Z", "+00:00"))


async def test_event_rules_match_domain_constants(client: AsyncClient) -> None:
    body = (await client.get("/api/event")).json()

    assert body["rules"] == {
        "min_participants": rules.MIN_PARTICIPANTS,
        "max_participants": rules.MAX_PARTICIPANTS,
        "min_age": rules.MIN_AGE,
        "max_age": rules.MAX_AGE,
        "max_name_length": rules.MAX_NAME_LENGTH,
        "full_ticket_min_age": rules.FULL_TICKET_MIN_AGE,
        "escort_required_below_age": rules.ESCORT_REQUIRED_BELOW_AGE,
        "adult_min_age": rules.ADULT_MIN_AGE,
        "prices": {"full": rules.FULL_PRICE, "child": rules.CHILD_PRICE},
    }
    # Текущие значения из ТЗ
    assert body["rules"]["prices"] == {"full": 2000, "child": 1000}
    assert body["rules"]["max_participants"] == 4
