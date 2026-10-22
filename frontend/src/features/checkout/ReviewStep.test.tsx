import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeEvent, makeOrder } from "../../test/fixtures";
import { goToReview } from "../../test/flow";
import { callsTo, jsonResponse, mockApi } from "../../test/mockApi";
import { Checkout } from "./Checkout";

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(routes: Parameters<typeof mockApi>[0] = {}) {
  const fetchMock = mockApi(routes);
  const user = userEvent.setup();
  render(<Checkout event={makeEvent()} />);
  return { user, fetchMock };
}

const total = () =>
  within(screen.getByRole("complementary", { name: "Итог заказа" })).getByTestId("order-total");

describe("экран проверки заказа", () => {
  it("показывает состав, email и итоговую стоимость", async () => {
    const { user, fetchMock } = setup();

    await goToReview(user);

    expect(screen.getByRole("heading", { name: "Проверьте заказ" })).toBeInTheDocument();
    expect(screen.getByText("buyer@mail.ru")).toBeInTheDocument();
    expect(screen.getByText("Анна")).toBeInTheDocument();
    expect(screen.getByText("35 лет · Полный билет")).toBeInTheDocument();
    expect(screen.getByText("Маша")).toBeInTheDocument();
    expect(screen.getByText("8 лет · Детский билет")).toBeInTheDocument();
    expect(total()).toHaveTextContent("3 000 ₽");
    // Места на этом шаге не резервируются: запросов к серверу ещё не было
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("«Изменить» возвращает к форме с сохранёнными значениями", async () => {
    const { user } = setup();
    await goToReview(user);

    await user.click(screen.getByRole("button", { name: "Изменить" }));

    expect(screen.getByLabelText("Контактный email")).toHaveValue("buyer@mail.ru");
    expect(screen.getByLabelText("Имя участника 1")).toHaveValue("Анна");
    expect(screen.getByLabelText("Возраст участника 1")).toHaveValue("35");
    expect(screen.getByLabelText("Имя участника 2")).toHaveValue("Маша");
    expect(screen.getByLabelText("Возраст участника 2")).toHaveValue("8");
  });

  it("после правки итог на экране проверки пересчитывается", async () => {
    const { user } = setup();
    await goToReview(user);
    await user.click(screen.getByRole("button", { name: "Изменить" }));

    const age = screen.getByLabelText("Возраст участника 2");
    await user.clear(age);
    await user.type(age, "14");
    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    expect(total()).toHaveTextContent("4 000 ₽");
    expect(screen.getByText("14 лет · Полный билет")).toBeInTheDocument();
  });

  it("на сервер уходят обрезанные имена, возраст числом и нет суммы", async () => {
    const { user, fetchMock } = setup({
      "POST /api/orders": () => jsonResponse(makeOrder(), 201),
    });
    await user.type(screen.getByLabelText("Контактный email"), "  buyer@mail.ru ");
    await user.type(screen.getByLabelText("Имя участника 1"), "  Анна ");
    await user.type(screen.getByLabelText("Возраст участника 1"), "35");
    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    await user.click(screen.getByRole("button", { name: "Подтвердить заказ" }));

    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init?.body as string)).toEqual({
      email: "buyer@mail.ru",
      participants: [{ name: "Анна", age: 35 }],
    });
  });
});

describe("защита от повторной отправки", () => {
  it("кнопка блокируется на время запроса, двойной клик — один запрос", async () => {
    let finish: () => void = () => {};
    const { user, fetchMock } = setup({
      // Запрос остаётся «в полёте», пока тест не завершит его
      "POST /api/orders": () =>
        new Promise<Response>((resolve) => {
          finish = () => resolve(jsonResponse(makeOrder(), 201));
        }),
    });
    await goToReview(user);
    const confirm = screen.getByRole("button", { name: "Подтвердить заказ" });

    await user.dblClick(confirm);

    expect(callsTo(fetchMock, "POST /api/orders")).toBe(1);
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Изменить" })).toBeDisabled();

    finish();
  });
});
