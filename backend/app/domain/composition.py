from collections.abc import Sequence

from app.domain.rules import ADULT_MIN_AGE, requires_escort


def escort_rule_violated(ages: Sequence[int]) -> bool:
    """Нарушено ли правило сопровождения.

    Нарушение: в заказе есть участник, которому нужен сопровождающий,
    а участника от `ADULT_MIN_AGE` лет в том же заказе нет.
    """
    needs_escort = any(requires_escort(age) for age in ages)
    has_adult = any(age >= ADULT_MIN_AGE for age in ages)
    return needs_escort and not has_adult
