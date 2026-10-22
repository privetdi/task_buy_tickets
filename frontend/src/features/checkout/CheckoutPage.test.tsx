import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeEvent } from "../../test/fixtures";
import { jsonResponse, mockApi } from "../../test/mockApi";
import CheckoutPage from "./CheckoutPage";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("загрузка мероприятия", () => {
  it("показывает индикатор, затем мероприятие и остаток мест", async () => {
    mockApi({ "GET /api/event": () => jsonResponse(makeEvent()) });

    render(<CheckoutPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Загружаем мероприятие");
    expect(
      await screen.findByRole("heading", { name: "Городской фестиваль науки" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Свободно мест: 10 из 10")).toBeInTheDocument();
  });

  it("при сбое показывает сообщение и «Повторить», повтор загружает данные", async () => {
    const routes: Parameters<typeof mockApi>[0] = {
      "GET /api/event": () => Promise.reject(new TypeError("Failed to fetch")),
    };
    mockApi(routes);
    const user = userEvent.setup();

    render(<CheckoutPage />);

    expect(
      await screen.findByText("Не удалось загрузить данные мероприятия"),
    ).toBeInTheDocument();

    routes["GET /api/event"] = () => jsonResponse(makeEvent());
    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(
      await screen.findByRole("heading", { name: "Городской фестиваль науки" }),
    ).toBeInTheDocument();
  });

  it("когда места закончились, в шапке об этом сказано", async () => {
    mockApi({ "GET /api/event": () => jsonResponse(makeEvent({ seats_available: 0 })) });

    render(<CheckoutPage />);

    expect(await screen.findByText("Места закончились")).toBeInTheDocument();
  });
});
