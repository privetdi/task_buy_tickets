import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeEvent } from "../../test/fixtures";
import { goToReview } from "../../test/flow";
import { callsTo, jsonResponse, mockApi } from "../../test/mockApi";
import { Checkout } from "./Checkout";

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(routes: Parameters<typeof mockApi>[0], demoMode = true) {
  const fetchMock = mockApi(routes);
  const user = userEvent.setup();
  render(<Checkout event={makeEvent({ demo_mode: demoMode })} />);
  return { user, fetchMock };
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Демо-инструменты"));
}

describe("демо-панель", () => {
  it("при demo_mode=false панели нет", () => {
    setup({}, false);

    expect(screen.queryByText("Демо-инструменты")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Сбросить" })).not.toBeInTheDocument();
  });

  it("при demo_mode=true панель есть и подписана как демонстрационная", () => {
    setup({});

    expect(screen.getByText("Демо-инструменты")).toBeInTheDocument();
    expect(screen.getByText("Демо")).toBeInTheDocument();
  });

  it("«Занять все свободные места» вызывает эндпоинт и обновляет остаток", async () => {
    const { user, fetchMock } = setup({
      "POST /api/demo/take-seats": () => jsonResponse({ seats_available: 0, total_seats: 10 }),
    });
    await openPanel(user);

    await user.click(screen.getByRole("button", { name: "Занять все свободные места" }));

    expect(await screen.findByText("Свободно 0 мест из 10")).toBeInTheDocument();
    expect(screen.getAllByText("Места закончились").length).toBeGreaterThan(0);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init?.body as string)).toEqual({ count: 10 });
  });

  it("«Сбросить» вызывает эндпоинт и возвращает остаток", async () => {
    const { user, fetchMock } = setup({
      "POST /api/demo/take-seats": () => jsonResponse({ seats_available: 0, total_seats: 10 }),
      "POST /api/demo/reset": () => jsonResponse({ seats_available: 10, total_seats: 10 }),
    });
    await openPanel(user);
    await user.click(screen.getByRole("button", { name: "Занять все свободные места" }));
    await screen.findByText("Свободно 0 мест из 10");

    await user.click(screen.getByRole("button", { name: "Сбросить" }));

    expect(await screen.findByText("Свободно мест: 10 из 10")).toBeInTheDocument();
    expect(callsTo(fetchMock, "POST /api/demo/reset")).toBe(1);
  });

  it("при сбое показывает сообщение и не ломает страницу", async () => {
    const { user } = setup({
      "POST /api/demo/reset": () => Promise.reject(new TypeError("Failed to fetch")),
    });
    await openPanel(user);

    await user.click(screen.getByRole("button", { name: "Сбросить" }));

    expect(await screen.findByText("Не удалось выполнить действие")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сбросить" })).toBeEnabled();
  });
});

describe("сценарий «места забрали, пока шло оформление»", () => {
  it("демо занимает места на экране проверки → подтверждение отклонено → сброс возвращает к правке", async () => {
    const { user } = setup({
      "POST /api/demo/take-seats": () => jsonResponse({ seats_available: 0, total_seats: 10 }),
      "POST /api/demo/reset": () => jsonResponse({ seats_available: 10, total_seats: 10 }),
      "POST /api/orders": () =>
        jsonResponse(
          { code: "not_enough_seats", message: "мало мест", seats_available: 0 },
          409,
        ),
    });
    await goToReview(user);

    await openPanel(user);
    await user.click(screen.getByRole("button", { name: "Занять все свободные места" }));
    await screen.findByText("Свободно 0 мест из 10");
    // Экран проверки не меняется сам: места не были зарезервированы заранее
    expect(screen.getByRole("heading", { name: "Проверьте заказ" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Подтвердить заказ" }));
    expect(await screen.findByRole("heading", { name: "Места закончились" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Сбросить" }));

    // Места снова есть — возвращаемся к правке с теми же данными
    expect(await screen.findByLabelText("Имя участника 2")).toHaveValue("Маша");
    expect(screen.queryByRole("heading", { name: "Места закончились" })).not.toBeInTheDocument();
  });
});
