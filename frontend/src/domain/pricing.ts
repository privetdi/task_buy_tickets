// Чистые функции расчёта. Повторяют бэкенд ради мгновенного отклика в форме;
// итоговую сумму подтверждённого заказа всегда возвращает сервер.
import type { Rules, TicketType } from "../api/types";

export function ticketTypeFor(age: number, rules: Rules): TicketType {
  return age < rules.full_ticket_min_age ? "child" : "full";
}

export function ticketPrice(ticketType: TicketType, rules: Rules): number {
  return rules.prices[ticketType];
}

/** Нужен ли участнику сопровождающий (единое определение «ребёнка» приходит из правил API). */
export function requiresEscort(age: number, rules: Rules): boolean {
  return age < rules.escort_required_below_age;
}

/** Нарушено ли правило: есть участник, которому нужен сопровождающий, а взрослого в заказе нет. */
export function escortRuleViolated(ages: number[], rules: Rules): boolean {
  const needsEscort = ages.some((age) => requiresEscort(age, rules));
  const hasAdult = ages.some((age) => age >= rules.adult_min_age);
  return needsEscort && !hasAdult;
}

export interface OrderSummary {
  total: number;
  counts: Record<TicketType, number>;
}

export function summarize(ages: number[], rules: Rules): OrderSummary {
  const counts: Record<TicketType, number> = { full: 0, child: 0 };
  let total = 0;
  for (const age of ages) {
    const type = ticketTypeFor(age, rules);
    counts[type] += 1;
    total += ticketPrice(type, rules);
  }
  return { total, counts };
}
