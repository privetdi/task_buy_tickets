import type { EventInfo, Order, Rules } from "../api/types";

/** Правила как в ответе бэкенда (значения из ТЗ). */
export const rules: Rules = {
  min_participants: 1,
  max_participants: 4,
  min_age: 0,
  max_age: 120,
  max_name_length: 100,
  full_ticket_min_age: 14,
  escort_required_below_age: 14,
  adult_min_age: 18,
  prices: { full: 2000, child: 1000 },
};

/** Заказ «Анна 35 + Маша 8», как его вернул бы сервер. */
export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 42,
    email: "buyer@mail.ru",
    participants: [
      { name: "Анна", age: 35, ticket_type: "full", price: 2000 },
      { name: "Маша", age: 8, ticket_type: "child", price: 1000 },
    ],
    total: 3000,
    created_at: "2026-10-22T10:00:00Z",
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<EventInfo> = {}): EventInfo {
  return {
    id: 1,
    title: "Городской фестиваль науки",
    starts_at: "2026-11-21T16:00:00Z",
    venue: "Центральный выставочный зал",
    total_seats: 10,
    seats_available: 10,
    rules,
    demo_mode: false,
    ...overrides,
  };
}
