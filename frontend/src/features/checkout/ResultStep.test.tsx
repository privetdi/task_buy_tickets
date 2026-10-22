import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeEvent, makeOrder } from "../../test/fixtures";
import { type User, goToReview } from "../../test/flow";
import { callsTo, jsonResponse, mockApi, sequence } from "../../test/mockApi";
import { Checkout } from "./Checkout";

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(routes: Parameters<typeof mockApi>[0]) {
  const fetchMock = mockApi(routes);
  const user = userEvent.setup();
  render(<Checkout event={makeEvent()} />);
  return { user, fetchMock };
}

const notEnoughSeats = (seats: number) => () =>
  jsonResponse({ code: "not_enough_seats", message: "мало мест", seats_available: seats }, 409);

const singleOrder = () =>
  jsonResponse(
    makeOrder({
      participants: [{ name: "Анна", age: 35, ticket_type: "full", price: 2000 }],
      total: 2000,
    }),
    201,
  );

async function confirm(user: User) {
  await user.click(screen.getByRole("button", { name: "Подтвердить заказ" }));
}

describe("успешное оформление", () => {
  it("показывает номер заказа, состав, email и итог, затем позволяет начать новый заказ", async () => {
    const { user } = setup({
      "POST /api/orders": () => jsonResponse(makeOrder(), 201),
      "GET /api/event": () => jsonResponse(makeEvent({ seats_available: 7 })),
    });
    await goToReview(user);

    await confirm(user);

    const heading = await screen.findByRole("heading", { name: "Заказ оформлен" });
    expect(heading).toHaveFocus();
    expect(screen.getByText("Номер заказа: № 42")).toBeInTheDocument();
    expect(screen.getByText("buyer@mail.ru")).toBeInTheDocument();
    expect(screen.getByText("Анна")).toBeInTheDocument();
    expect(screen.getByText("Маша")).toBeInTheDocument();
    expect(screen.getByTestId("order-total")).toHaveTextContent("3 000 ₽");
    // Остаток в шапке уже уменьшен на число участников
    expect(screen.getByText("Свободно мест: 8 из 10")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Оформить новый заказ" }));

    expect(screen.getByLabelText("Имя участника 1")).toHaveValue("");
    expect(screen.getByLabelText("Контактный email")).toHaveValue("");
    expect(screen.queryByLabelText("Имя участника 2")).not.toBeInTheDocument();
    // Остаток обновляется с сервера
    expect(await screen.findByText("Свободно мест: 7 из 10")).toBeInTheDocument();
  });
});

describe("нехватка мест перед подтверждением", () => {
  it("сообщает об остатке, сохраняет данные, после уменьшения заказа он проходит", async () => {
    const { user, fetchMock } = setup({
      "POST /api/orders": sequence(notEnoughSeats(1), singleOrder),
    });
    await goToReview(user);

    await confirm(user);

    const heading = await screen.findByRole("heading", { name: "Не хватает мест" });
    expect(heading.closest("section")).toHaveTextContent(
      "Осталось 1 место, а в заказе 2 участника",
    );
    expect(screen.getByText("Свободно мест: 1 из 10")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Подтвердить заказ" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Изменить заказ" }));

    // Данные сохранены, форма подсказывает, сколько мест осталось
    expect(screen.getByLabelText("Имя участника 2")).toHaveValue("Маша");
    expect(screen.getByRole("alert")).toHaveTextContent("Свободно мест: 1");

    await user.click(screen.getByRole("button", { name: "Удалить участника 2" }));
    expect(screen.queryByText("Мест стало меньше")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Продолжить" }));
    await confirm(user);

    expect(await screen.findByRole("heading", { name: "Заказ оформлен" })).toBeInTheDocument();
    expect(callsTo(fetchMock, "POST /api/orders")).toBe(2);
  });

  it("места закончились: состояние «распродано» без возможности подтвердить", async () => {
    const { user } = setup({
      "POST /api/orders": notEnoughSeats(0),
      "GET /api/event": () => jsonResponse(makeEvent({ seats_available: 10 })),
    });
    await goToReview(user);

    await confirm(user);

    expect(await screen.findByRole("heading", { name: "Места закончились" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Подтвердить заказ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Изменить заказ" })).not.toBeInTheDocument();

    // Когда места появились, возвращаемся к правке с теми же данными
    await user.click(screen.getByRole("button", { name: "Проверить наличие мест" }));

    expect(await screen.findByLabelText("Имя участника 2")).toHaveValue("Маша");
    expect(screen.getByText("Свободно мест: 10 из 10")).toBeInTheDocument();
  });

  it("если мест всё ещё нет, остаёмся в состоянии «распродано»", async () => {
    const { user } = setup({
      "POST /api/orders": notEnoughSeats(0),
      "GET /api/event": () => jsonResponse(makeEvent({ seats_available: 0 })),
    });
    await goToReview(user);
    await confirm(user);
    await screen.findByRole("heading", { name: "Места закончились" });

    await user.click(screen.getByRole("button", { name: "Проверить наличие мест" }));

    expect(screen.getByRole("heading", { name: "Места закончились" })).toBeInTheDocument();
  });
});

describe("сбои при подтверждении", () => {
  it("сбой сети: сообщение, данные сохранены, повтор проходит", async () => {
    const { user } = setup({
      "POST /api/orders": sequence(
        () => Promise.reject(new TypeError("Failed to fetch")),
        () => jsonResponse(makeOrder(), 201),
      ),
    });
    await goToReview(user);

    await confirm(user);

    expect(await screen.findByRole("heading", { name: "Не удалось оформить заказ" })).toBeVisible();
    expect(screen.getByText(/Нет связи с сервером/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByRole("heading", { name: "Заказ оформлен" })).toBeInTheDocument();
  });

  it("из ошибки можно вернуться к правке, данные на месте", async () => {
    const { user } = setup({
      "POST /api/orders": () => Promise.reject(new TypeError("Failed to fetch")),
    });
    await goToReview(user);
    await confirm(user);
    await screen.findByRole("heading", { name: "Не удалось оформить заказ" });

    await user.click(screen.getByRole("button", { name: "Изменить заказ" }));

    expect(screen.getByLabelText("Контактный email")).toHaveValue("buyer@mail.ru");
    expect(screen.getByLabelText("Имя участника 1")).toHaveValue("Анна");
  });

  it("ошибка сервера описана отдельно от сбоя сети", async () => {
    const { user } = setup({
      "POST /api/orders": () => new Response("boom", { status: 500 }),
    });
    await goToReview(user);

    await confirm(user);

    expect(await screen.findByText(/На сервере произошла ошибка/)).toBeInTheDocument();
  });

  it("сервер отклонил поле: возврат к форме, поле подсвечено и в фокусе", async () => {
    const { user } = setup({
      "POST /api/orders": () =>
        jsonResponse(
          {
            code: "validation_error",
            message: "Проверьте данные заказа",
            fields: [{ field: "participants.1.name", message: "bad" }],
          },
          422,
        ),
    });
    await goToReview(user);

    await confirm(user);

    const name = await screen.findByLabelText("Имя участника 2");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveFocus();
    expect(screen.getByText("Проверьте имя")).toBeInTheDocument();
  });

  it("сервер отклонил заказ по правилу сопровождения: групповое сообщение", async () => {
    const { user } = setup({
      "POST /api/orders": () =>
        jsonResponse({ code: "child_requires_adult", message: "нужен взрослый" }, 422),
    });
    await goToReview(user);

    await confirm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Дети младше 14 лет допускаются только вместе с участником от 18 лет",
    );
  });
});
