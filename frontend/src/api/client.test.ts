import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NetworkError,
  NotEnoughSeatsError,
  ServerError,
  ValidationError,
  createOrder,
  fetchEvent,
  resetDemo,
  takeSeats,
} from "./client";
import type { OrderRequest } from "./types";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const order: OrderRequest = { email: "a@mail.ru", participants: [{ name: "Анна", age: 30 }] };

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("успешные запросы", () => {
  it("fetchEvent возвращает мероприятие", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, title: "Фестиваль" }));

    await expect(fetchEvent()).resolves.toMatchObject({ id: 1, title: "Фестиваль" });
    expect(fetchMock).toHaveBeenCalledWith("/api/event", undefined);
  });

  it("createOrder отправляет JSON и возвращает заказ", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7, total: 2000 }, 201));

    await expect(createOrder(order)).resolves.toMatchObject({ id: 7, total: 2000 });

    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe("/api/orders");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(order);
  });

  it("демо-запросы идут на свои эндпоинты", async () => {
    // Тело Response читается один раз, поэтому на каждый вызов отдаём новый ответ
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ seats_available: 0, total_seats: 10 })),
    );

    await takeSeats(10);
    await resetDemo();

    expect(fetchMock.mock.calls[0]![0]).toBe("/api/demo/take-seats");
    expect(JSON.parse(fetchMock.mock.calls[0]![1]?.body as string)).toEqual({ count: 10 });
    expect(fetchMock.mock.calls[1]![0]).toBe("/api/demo/reset");
  });
});

describe("ошибки", () => {
  it("409 not_enough_seats → NotEnoughSeatsError с остатком", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ code: "not_enough_seats", message: "мало", seats_available: 2 }, 409),
    );

    const error = await createOrder(order).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotEnoughSeatsError);
    expect((error as NotEnoughSeatsError).seatsAvailable).toBe(2);
  });

  it("422 validation_error → ValidationError с путями полей", async () => {
    const fields = [{ field: "participants.1.name", message: "пусто" }];
    fetchMock.mockResolvedValue(
      jsonResponse({ code: "validation_error", message: "Проверьте данные", fields }, 422),
    );

    const error = await createOrder(order).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe("validation_error");
    expect((error as ValidationError).fields).toEqual(fields);
  });

  it("422 child_requires_adult → ValidationError с кодом правила", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ code: "child_requires_adult", message: "нужен взрослый" }, 422),
    );

    const error = await createOrder(order).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe("child_requires_adult");
    expect((error as ValidationError).fields).toEqual([]);
  });

  it("сбой сети → NetworkError", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchEvent()).rejects.toBeInstanceOf(NetworkError);
  });

  it("500 → ServerError со статусом", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));

    const error = await fetchEvent().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServerError);
    expect((error as ServerError).status).toBe(500);
  });

  it("неожиданное тело ошибки → ServerError", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Not Found" }, 404));

    await expect(fetchEvent()).rejects.toBeInstanceOf(ServerError);
  });

  it("успешный ответ не JSON → ServerError", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));

    await expect(fetchEvent()).rejects.toBeInstanceOf(ServerError);
  });
});
