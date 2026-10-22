import { vi } from "vitest";

export type Handler = (init: RequestInit | undefined) => Response | Promise<Response>;

/** Отвечает по очереди разными обработчиками; последний повторяется. */
export function sequence(...handlers: Handler[]): Handler {
  let index = 0;
  return (init) => handlers[Math.min(index++, handlers.length - 1)]!(init);
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Подменяет `fetch` игрушечным бэкендом: ключ маршрута — «МЕТОД /путь».
 * Объект маршрутов можно менять по ходу теста (например, сначала сбой, потом успех).
 */
export function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${String(input)}`;
    const handler = routes[key];
    if (!handler) throw new Error(`mockApi: нет обработчика для «${key}»`);
    return handler(init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Сколько раз вызывался маршрут. */
export function callsTo(fetchMock: ReturnType<typeof mockApi>, key: string): number {
  return fetchMock.mock.calls.filter(
    ([input, init]) => `${init?.method ?? "GET"} ${String(input)}` === key,
  ).length;
}
