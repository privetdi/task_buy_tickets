import type {
  ApiErrorBody,
  EventInfo,
  FieldError,
  Order,
  OrderRequest,
  SeatsState,
} from "./types";

/** Нет связи с сервером: запрос не дошёл или ответ не получен. */
export class NetworkError extends Error {
  constructor() {
    super("Нет связи с сервером");
  }
}

/** Сервер ответил неожиданно: ошибка 5xx или ответ не в ожидаемом формате. */
export class ServerError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Ошибка сервера (${status})`);
    this.status = status;
  }
}

/** Заказ не прошёл проверку: ошибка полей либо правила состава группы. */
export class ValidationError extends Error {
  readonly code: "validation_error" | "child_requires_adult";
  readonly fields: FieldError[];

  constructor(code: ValidationError["code"], message: string, fields: FieldError[]) {
    super(message);
    this.code = code;
    this.fields = fields;
  }
}

/** Мест меньше, чем участников; `seatsAvailable` — актуальный остаток. */
export class NotEnoughSeatsError extends Error {
  readonly seatsAvailable: number;

  constructor(message: string, seatsAvailable: number) {
    super(message);
    this.seatsAvailable = seatsAvailable;
  }
}

async function readErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "code" in body && "message" in body) {
      return body as ApiErrorBody;
    }
  } catch {
    // тело не JSON — обработаем как неожиданный ответ
  }
  return null;
}

/** Переводит ответ с ошибкой в типизированное исключение. */
async function toError(response: Response): Promise<Error> {
  const body = await readErrorBody(response);

  if (response.status === 409 && body?.code === "not_enough_seats") {
    return new NotEnoughSeatsError(body.message, body.seats_available ?? 0);
  }
  if (response.status === 422 && body?.code === "validation_error") {
    return new ValidationError("validation_error", body.message, body.fields ?? []);
  }
  if (response.status === 422 && body?.code === "child_requires_adult") {
    return new ValidationError("child_requires_adult", body.message, []);
  }
  return new ServerError(response.status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new NetworkError();
  }
  if (!response.ok) {
    throw await toError(response);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ServerError(response.status);
  }
}

function postJson<T>(path: string, payload?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

export const fetchEvent = () => request<EventInfo>("/api/event");

export const createOrder = (order: OrderRequest) => postJson<Order>("/api/orders", order);

export const takeSeats = (count: number) => postJson<SeatsState>("/api/demo/take-seats", { count });

export const resetDemo = () => postJson<SeatsState>("/api/demo/reset");
