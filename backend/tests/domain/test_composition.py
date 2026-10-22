import pytest

from app.domain.composition import escort_rule_violated


@pytest.mark.parametrize(
    ("ages", "violated"),
    [
        # ребёнок один
        ([10], True),
        # подросток 17 лет сопровождающим не считается
        ([10, 17], True),
        ([5, 13, 16], True),
        # ребёнок со взрослым от 18
        ([10, 18], False),
        # несколько детей и один взрослый
        ([3, 5, 9, 40], False),
        # детей младше 14 нет — правило не применяется
        ([14], False),
        ([14, 17], False),
        ([30, 31], False),
    ],
)
def test_escort_rule(ages: list[int], violated: bool) -> None:
    assert escort_rule_violated(ages) is violated
