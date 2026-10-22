import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { makeEvent } from "../../test/fixtures";
import { Checkout } from "./Checkout";

const GROUP_ERROR = "Дети младше 14 лет допускаются только вместе с участником от 18 лет";

function setup() {
  const user = userEvent.setup();
  render(<Checkout event={makeEvent()} />);
  return user;
}

const total = () =>
  within(screen.getByRole("complementary", { name: "Итог заказа" })).getByTestId("order-total");

async function fillParticipant(
  user: ReturnType<typeof userEvent.setup>,
  number: number,
  name: string,
  age: string,
) {
  await user.type(screen.getByLabelText(`Имя участника ${number}`), name);
  await user.type(screen.getByLabelText(`Возраст участника ${number}`), age);
}

describe("начальное состояние", () => {
  it("email, один участник, добавление доступно, удаление единственного — нет", () => {
    setup();

    expect(screen.getByLabelText("Контактный email")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Участник 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить участника" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Удалить участника/ })).not.toBeInTheDocument();
    expect(total()).toHaveTextContent("0 ₽");
  });

  it("email — один на заказ: у участников нет своих полей email", () => {
    setup();

    expect(screen.getAllByLabelText(/email/i)).toHaveLength(1);
  });
});

describe("состав заказа", () => {
  it("добавление до максимума, затем кнопка недоступна", async () => {
    const user = setup();
    const add = screen.getByRole("button", { name: "Добавить участника" });

    await user.click(add);
    await user.click(add);
    await user.click(add);

    expect(screen.getAllByRole("heading", { name: /^Участник \d$/ })).toHaveLength(4);
    expect(add).toBeDisabled();
  });

  it("удаление участника; у единственного кнопки удаления нет", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Добавить участника" }));

    await user.click(screen.getByRole("button", { name: "Удалить участника 2" }));

    expect(screen.getAllByRole("heading", { name: /^Участник \d$/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Удалить участника/ })).not.toBeInTheDocument();
  });

  it("удаление сохраняет данные остальных участников", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Добавить участника" }));
    await fillParticipant(user, 1, "Анна", "35");
    await fillParticipant(user, 2, "Маша", "8");

    await user.click(screen.getByRole("button", { name: "Удалить участника 1" }));

    expect(screen.getByLabelText("Имя участника 1")).toHaveValue("Маша");
    expect(screen.getByLabelText("Возраст участника 1")).toHaveValue("8");
  });
});

describe("живой расчёт билетов и стоимости", () => {
  it("возраст 8 → «Детский билет — 1 000 ₽»", async () => {
    const user = setup();

    await user.type(screen.getByLabelText("Возраст участника 1"), "8");

    expect(screen.getByText("Детский билет — 1 000 ₽")).toBeInTheDocument();
    expect(total()).toHaveTextContent("1 000 ₽");
  });

  it("граница: 13 лет — детский, 14 — полный", async () => {
    const user = setup();
    const age = screen.getByLabelText("Возраст участника 1");

    await user.type(age, "13");
    expect(screen.getByText("Детский билет — 1 000 ₽")).toBeInTheDocument();

    await user.clear(age);
    await user.type(age, "14");
    expect(screen.getByText("Полный билет — 2 000 ₽")).toBeInTheDocument();
  });

  it("итог — сумма билетов всех участников и пересчитывается при смене возраста", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Добавить участника" }));
    await user.type(screen.getByLabelText("Возраст участника 1"), "35");
    await user.type(screen.getByLabelText("Возраст участника 2"), "13");
    expect(total()).toHaveTextContent("3 000 ₽");

    const second = screen.getByLabelText("Возраст участника 2");
    await user.clear(second);
    await user.type(second, "14");

    expect(total()).toHaveTextContent("4 000 ₽");
  });

  it("если возраст указан не у всех, итог помечен как неполный", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Добавить участника" }));
    await user.type(screen.getByLabelText("Возраст участника 1"), "35");

    expect(screen.getByText(/Итог уточнится/)).toBeInTheDocument();
  });
});

describe("подсказки валидации и блокировка перехода", () => {
  it("пустая отправка: ошибки у каждого поля, фокус на первом некорректном", async () => {
    const user = setup();

    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    expect(screen.getByText("Укажите email")).toBeInTheDocument();
    expect(screen.getByText("Укажите имя")).toBeInTheDocument();
    expect(screen.getByText("Укажите возраст")).toBeInTheDocument();
    expect(screen.getByLabelText("Контактный email")).toHaveFocus();
    expect(screen.getByLabelText("Контактный email")).toHaveAttribute("aria-invalid", "true");
    // Остаёмся на форме
    expect(screen.getByRole("button", { name: "Продолжить" })).toBeInTheDocument();
  });

  it("если email верный, фокус уходит на первое некорректное поле участника", async () => {
    const user = setup();
    await user.type(screen.getByLabelText("Контактный email"), "buyer@mail.ru");

    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    expect(screen.getByLabelText("Имя участника 1")).toHaveFocus();
  });

  it("поля не подсвечиваются, пока покупатель не пытался продолжить", async () => {
    const user = setup();

    await user.type(screen.getByLabelText("Контактный email"), "oops");

    expect(screen.queryByText(/Проверьте адрес/)).not.toBeInTheDocument();
  });

  it("исправление поля убирает ошибку без лишних действий", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Продолжить" }));
    expect(screen.getByText("Укажите имя")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Имя участника 1"), "Анна");

    expect(screen.queryByText("Укажите имя")).not.toBeInTheDocument();
  });

  it("ребёнок один: групповое сообщение и блокировка перехода", async () => {
    const user = setup();
    await user.type(screen.getByLabelText("Контактный email"), "buyer@mail.ru");
    await fillParticipant(user, 1, "Маша", "7");

    expect(screen.getByText(GROUP_ERROR)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    // Фокус — на самом сообщении (role="alert"), а не на вложенном тексте
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent(GROUP_ERROR);
    expect(screen.getByRole("button", { name: "Продолжить" })).toBeInTheDocument();
  });

  it("ребёнок и подросток 17 лет — всё ещё блокировка; со взрослым 18 — сообщение исчезает", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Добавить участника" }));
    await fillParticipant(user, 1, "Маша", "7");
    await fillParticipant(user, 2, "Лёша", "17");
    expect(screen.getByText(GROUP_ERROR)).toBeInTheDocument();

    const age = screen.getByLabelText("Возраст участника 2");
    await user.clear(age);
    await user.type(age, "18");

    expect(screen.queryByText(GROUP_ERROR)).not.toBeInTheDocument();
  });

  it("поля доступны по подписям, ошибка связана с полем", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    const email = screen.getByLabelText("Контактный email");
    const describedBy = email.getAttribute("aria-describedby");

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("Укажите email");
  });
});
