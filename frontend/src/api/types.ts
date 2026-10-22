// Типы повторяют контракт бэкенда (см. раздел «API» в README). Имена полей — как в JSON.

export type TicketType = "full" | "child";

export interface Rules {
  min_participants: number;
  max_participants: number;
  min_age: number;
  max_age: number;
  max_name_length: number;
  full_ticket_min_age: number;
  escort_required_below_age: number;
  adult_min_age: number;
  prices: Record<TicketType, number>;
}

export interface EventInfo {
  id: number;
  title: string;
  starts_at: string;
  venue: string;
  total_seats: number;
  seats_available: number;
  rules: Rules;
  demo_mode: boolean;
}

export interface OrderRequest {
  email: string;
  participants: { name: string; age: number }[];
}

export interface OrderParticipant {
  name: string;
  age: number;
  ticket_type: TicketType;
  price: number;
}

export interface Order {
  id: number;
  email: string;
  participants: OrderParticipant[];
  total: number;
  created_at: string;
}

export interface SeatsState {
  seats_available: number;
  total_seats: number;
}

export interface FieldError {
  field: string;
  message: string;
}

/** Единый формат ошибки бэкенда. */
export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: FieldError[];
  seats_available?: number;
}
