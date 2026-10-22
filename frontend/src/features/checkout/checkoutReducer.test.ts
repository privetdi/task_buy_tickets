import { describe, expect, it } from "vitest";

import { NetworkError, NotEnoughSeatsError, ServerError, ValidationError } from "../../api/client";
import type { Order } from "../../api/types";
import { rules } from "../../test/fixtures";
import {
  type CheckoutAction,
  type CheckoutState,
  checkoutReducer,
  createInitialState,
  visibleErrors,
} from "./checkoutReducer";

const order: Order = {
  id: 7,
  email: "buyer@mail.ru",
  participants: [
    { name: "Анна", age: 35, ticket_type: "full", price: 2000 },
    { name: "Маша", age: 8, ticket_type: "child", price: 1000 },
  ],
  total: 3000,
  created_at: "2026-10-22T10:00:00Z",
};

/** Прогоняет действия через редьюсер. */
function run(actions: CheckoutAction[], from?: CheckoutState): CheckoutState {
  return actions.reduce(checkoutReducer, from ?? createInitialState(rules, 10));
}

/** Состояние с заполненной корректной формой (Анна 35 + Маша 8) на шаге формы. */
const filledForm: CheckoutAction[] = [
  { type: "edit_email", value: "buyer@mail.ru" },
  { type: "edit_participant", index: 0, field: "name", value: "Анна" },
  { type: "edit_participant", index: 0, field: "age", value: "35" },
  { type: "add_participant" },
  { type: "edit_participant", index: 1, field: "name", value: "Маша" },
  { type: "edit_participant", index: 1, field: "age", value: "8" },
];

const inReview = () => run([...filledForm, { type: "continue" }]);
const inSubmitting = () => run([{ type: "submit_started" }], inReview());

describe("начальное состояние", () => {
  it("шаг формы, один пустой участник, остаток из мероприятия", () => {
    const state = createInitialState(rules, 10);

    expect(state.step).toBe("form");
    expect(state.form.participants).toEqual([{ name: "", age: "" }]);
    expect(state.seatsAvailable).toBe(10);
  });
});

describe("правка формы", () => {
  it("меняет email и поля участника", () => {
    const state = run(filledForm);

    expect(state.form.email).toBe("buyer@mail.ru");
    expect(state.form.participants).toEqual([
      { name: "Анна", age: "35" },
      { name: "Маша", age: "8" },
    ]);
  });

  it("не даёт добавить больше максимума участников", () => {
    const state = run(Array.from({ length: 10 }, () => ({ type: "add_participant" }) as const));

    expect(state.form.participants).toHaveLength(4);
  });

  it("не даёт удалить последнего участника", () => {
    const state = run([{ type: "remove_participant", index: 0 }]);

    expect(state.form.participants).toHaveLength(1);
  });

  it("удаляет нужного участника", () => {
    const state = run([...filledForm, { type: "remove_participant", index: 0 }]);

    expect(state.form.participants).toEqual([{ name: "Маша", age: "8" }]);
  });

  it("правки вне шага формы игнорируются", () => {
    const review = inReview();

    expect(checkoutReducer(review, { type: "edit_email", value: "x@y.ru" })).toBe(review);
  });
});

describe("переход к проверке", () => {
  it("с ошибками остаётся на форме, включает показ ошибок и считает попытки", () => {
    const state = run([{ type: "continue" }]);

    expect(state.step).toBe("form");
    expect(state.showErrors).toBe(true);
    expect(state.attempts).toBe(1);
    expect(visibleErrors(state).participants[0]?.name).toBe("Укажите имя");
  });

  it("с корректной формой переходит к проверке", () => {
    expect(inReview().step).toBe("review");
  });

  it("ребёнок без взрослого блокирует переход", () => {
    const state = run([
      { type: "edit_email", value: "buyer@mail.ru" },
      { type: "edit_participant", index: 0, field: "name", value: "Маша" },
      { type: "edit_participant", index: 0, field: "age", value: "7" },
      { type: "continue" },
    ]);

    expect(state.step).toBe("form");
    expect(visibleErrors(state).group).toMatch(/Дети младше 14 лет/);
  });

  it("исправление поля убирает ошибку без дополнительных действий", () => {
    const failed = run([{ type: "continue" }]);
    expect(visibleErrors(failed).participants[0]?.name).toBeDefined();

    const fixed = run([{ type: "edit_participant", index: 0, field: "name", value: "Анна" }], failed);

    expect(visibleErrors(fixed).participants[0]?.name).toBeUndefined();
  });
});

describe("видимость ошибок", () => {
  it("до первой попытки поля не подсвечиваются, но групповая ошибка видна сразу", () => {
    const state = run([
      { type: "edit_participant", index: 0, field: "name", value: "Маша" },
      { type: "edit_participant", index: 0, field: "age", value: "7" },
    ]);

    const errors = visibleErrors(state);

    expect(errors.email).toBeUndefined();
    expect(errors.participants[0]).toEqual({});
    expect(errors.group).toBeDefined();
  });
});

describe("правка с экрана проверки", () => {
  it("«Изменить» возвращает на форму с сохранёнными данными", () => {
    const state = run([{ type: "back_to_form" }], inReview());

    expect(state.step).toBe("form");
    expect(state.form).toEqual(inReview().form);
  });
});

describe("подтверждение заказа", () => {
  it("submit_started — только с экрана проверки", () => {
    const form = run(filledForm);

    expect(checkoutReducer(form, { type: "submit_started" })).toBe(form);
    expect(inSubmitting().step).toBe("submitting");
  });

  it("повторный submit_started во время отправки игнорируется", () => {
    const submitting = inSubmitting();

    expect(checkoutReducer(submitting, { type: "submit_started" })).toBe(submitting);
  });

  it("успех сохраняет заказ и уменьшает остаток", () => {
    const state = run([{ type: "submit_succeeded", order }], inSubmitting());

    expect(state.step).toBe("success");
    expect(state.order).toEqual(order);
    expect(state.seatsAvailable).toBe(8);
  });

  it("новый заказ сбрасывает форму, остаток сохраняется", () => {
    const state = run(
      [{ type: "submit_succeeded", order }, { type: "new_order" }],
      inSubmitting(),
    );

    expect(state.step).toBe("form");
    expect(state.form.participants).toEqual([{ name: "", age: "" }]);
    expect(state.order).toBeNull();
    expect(state.seatsAvailable).toBe(8);
  });
});

describe("нехватка мест", () => {
  const seatsError = () =>
    run([{ type: "submit_failed", error: new NotEnoughSeatsError("мало", 1) }], inSubmitting());

  it("переводит на шаг нехватки, берёт остаток из ответа и сохраняет данные", () => {
    const state = seatsError();

    expect(state.step).toBe("seats_error");
    expect(state.seatsAvailable).toBe(1);
    expect(state.seatsConflict).toBe(true);
    expect(state.form).toEqual(inReview().form);
  });

  it("распродано: остаток 0", () => {
    const state = run(
      [{ type: "submit_failed", error: new NotEnoughSeatsError("нет", 0) }],
      inSubmitting(),
    );

    expect(state.step).toBe("seats_error");
    expect(state.seatsAvailable).toBe(0);
  });

  it("«Изменить заказ» ведёт на форму, после уменьшения заказа можно продолжить", () => {
    const state = run(
      [
        { type: "back_to_form" },
        { type: "remove_participant", index: 1 },
        { type: "continue" },
        { type: "submit_started" },
        { type: "submit_succeeded", order: { ...order, participants: order.participants.slice(0, 1) } },
      ],
      seatsError(),
    );

    expect(state.step).toBe("success");
    expect(state.seatsAvailable).toBe(0);
  });

  it("когда места снова появились, возвращает к правке с теми же данными", () => {
    const state = run([{ type: "seats_refreshed", seatsAvailable: 10 }], seatsError());

    expect(state.step).toBe("form");
    expect(state.seatsAvailable).toBe(10);
    expect(state.form).toEqual(inReview().form);
  });

  it("обновление остатка до 0 не уводит с шага нехватки", () => {
    const state = run([{ type: "seats_refreshed", seatsAvailable: 0 }], seatsError());

    expect(state.step).toBe("seats_error");
  });

  it("обновление остатка на экране проверки не меняет шаг", () => {
    const state = run([{ type: "seats_refreshed", seatsAvailable: 0 }], inReview());

    expect(state.step).toBe("review");
    expect(state.seatsAvailable).toBe(0);
  });
});

describe("ошибки отправки", () => {
  it("ошибка валидации от сервера возвращает на форму и подсвечивает поле", () => {
    const error = new ValidationError("validation_error", "x", [
      { field: "participants.1.name", message: "bad" },
    ]);

    const state = run([{ type: "submit_failed", error }], inSubmitting());

    expect(state.step).toBe("form");
    expect(visibleErrors(state).participants[1]?.name).toBe("Проверьте имя");
  });

  it("ошибки сервера сбрасываются при правке поля", () => {
    const error = new ValidationError("validation_error", "x", [{ field: "email", message: "bad" }]);
    const failed = run([{ type: "submit_failed", error }], inSubmitting());
    expect(visibleErrors(failed).email).toBe("Проверьте email");

    const edited = run([{ type: "edit_email", value: "other@mail.ru" }], failed);

    expect(edited.serverErrors).toBeNull();
    expect(visibleErrors(edited).email).toBeUndefined();
  });

  it("сбой сети → шаг ошибки, данные сохранены, можно повторить", () => {
    const failed = run([{ type: "submit_failed", error: new NetworkError() }], inSubmitting());

    expect(failed.step).toBe("error");
    expect(failed.failure).toBe("network");
    expect(failed.form).toEqual(inReview().form);

    const retry = run([{ type: "submit_started" }], failed);
    expect(retry.step).toBe("submitting");
  });

  it("ошибка сервера отличается от сбоя сети", () => {
    const state = run([{ type: "submit_failed", error: new ServerError(500) }], inSubmitting());

    expect(state.failure).toBe("server");
  });

  it("из ошибки можно вернуться к правке", () => {
    const failed = run([{ type: "submit_failed", error: new NetworkError() }], inSubmitting());

    expect(run([{ type: "back_to_form" }], failed).step).toBe("form");
  });
});
