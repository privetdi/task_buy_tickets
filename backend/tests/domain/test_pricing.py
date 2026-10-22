import pytest

from app.domain.pricing import TicketType, calculate_total, price_for, ticket_type_for


@pytest.mark.parametrize(
    ("age", "expected"),
    [
        (0, TicketType.CHILD),
        (13, TicketType.CHILD),
        (14, TicketType.FULL),
        (17, TicketType.FULL),
        (18, TicketType.FULL),
        (120, TicketType.FULL),
    ],
)
def test_ticket_type_by_age(age: int, expected: TicketType) -> None:
    assert ticket_type_for(age) is expected


def test_prices() -> None:
    assert price_for(TicketType.FULL) == 2000
    assert price_for(TicketType.CHILD) == 1000


@pytest.mark.parametrize(
    ("ages", "expected_total"),
    [
        ([35, 33, 8], 5000),
        ([20], 2000),
        ([40, 10], 3000),
        ([14, 14, 14, 14], 8000),
        ([40, 7, 7, 7], 5000),
    ],
)
def test_total_is_sum_of_ticket_prices(ages: list[int], expected_total: int) -> None:
    assert calculate_total(ages) == expected_total


def test_changing_age_across_boundary_changes_total() -> None:
    assert calculate_total([30, 14]) - calculate_total([30, 13]) == 1000
