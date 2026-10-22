import { describe, expect, it } from "vitest";

import { ValidationError } from "../api/client";
import { rules } from "../test/fixtures";
import {
  type CheckoutForm,
  formErrorsFromServer,
  hasErrors,
  parseAge,
  toOrderRequest,
  validAge,
  validateForm,
} from "./validation";

const EMAIL = "buyer@mail.ru";

function form(participants: [string, string][], email = EMAIL): CheckoutForm {
  return {
    email,
    participants: participants.map(([name, age]) => ({ name, age })),
  };
}

describe("parseAge / validAge", () => {
  it.each([
    ["8", 8],
    ["0", 0],
    [" 30 ", 30],
    ["120", 120],
  ])("«%s» → %i", (raw, expected) => {
    expect(parseAge(raw)).toBe(expected);
    expect(validAge(raw, rules)).toBe(expected);
  });

  it.each(["", "  ", "12.5", "12,5", "-1", "abc", "1e2", "+5", "1000"])(
    "«%s» — не возраст",
    (raw) => {
      expect(parseAge(raw)).toBeNull();
    },
  );

  it("возраст вне границ правил не проходит validAge", () => {
    expect(validAge("121", rules)).toBeNull();
    expect(validAge("120", rules)).toBe(120);
  });
});

describe("validateForm", () => {
  it("корректная форма без ошибок", () => {
    const errors = validateForm(form([["Анна", "35"], ["Маша", "8"]]), rules);

    expect(hasErrors(errors)).toBe(false);
  });

  it("пустые поля дают ошибки у каждого поля", () => {
    const errors = validateForm(form([["", ""]], ""), rules);

    expect(errors.email).toBe("Укажите email");
    expect(errors.participants[0]).toEqual({ name: "Укажите имя", age: "Укажите возраст" });
    expect(hasErrors(errors)).toBe(true);
  });

  it("имя из одних пробелов — ошибка", () => {
    const errors = validateForm(form([["   ", "30"]]), rules);

    expect(errors.participants[0]?.name).toBe("Укажите имя");
  });

  it("слишком длинное имя — ошибка", () => {
    const errors = validateForm(form([["x".repeat(101), "30"]]), rules);

    expect(errors.participants[0]?.name).toMatch(/Не длиннее 100/);
  });

  it.each(["12.5", "-1", "121", "abc"])("возраст «%s» — ошибка диапазона", (age) => {
    const errors = validateForm(form([["Иван", age]]), rules);

    expect(errors.participants[0]?.age).toBe("Возраст — целое число от 0 до 120");
  });

  it.each(["", "not-an-email", "a@b", "user@", "@mail.ru", "a b@mail.ru"])(
    "email «%s» — ошибка",
    (email) => {
      expect(validateForm(form([["Иван", "30"]], email), rules).email).toBeDefined();
    },
  );

  it("ошибка в втором участнике не затрагивает первого", () => {
    const errors = validateForm(form([["Иван", "30"], ["", "30"]]), rules);

    expect(errors.participants[0]).toEqual({});
    expect(errors.participants[1]?.name).toBe("Укажите имя");
  });
});

describe("правило сопровождения в форме", () => {
  const message =
    "Дети младше 14 лет допускаются только вместе с участником от 18 лет";

  it.each([
    [[["Маша", "10"]]],
    [[["Маша", "10"], ["Лёша", "17"]]],
    [[["А", "5"], ["Б", "13"], ["В", "16"]]],
  ] as [string, string][][][])("ребёнок без взрослого → групповая ошибка (%j)", (participants) => {
    expect(validateForm(form(participants), rules).group).toBe(message);
  });

  it.each([
    [[["Маша", "10"], ["Анна", "18"]]],
    [[["А", "3"], ["Б", "5"], ["В", "9"], ["Г", "40"]]],
    [[["Лёша", "14"]]],
    [[["Лёша", "14"], ["Саша", "17"]]],
  ] as [string, string][][][])("допустимый состав → без групповой ошибки (%j)", (participants) => {
    expect(validateForm(form(participants), rules).group).toBeUndefined();
  });

  it("пока возраст одного из участников не заполнен, групповая ошибка не показывается", () => {
    const errors = validateForm(form([["Маша", "7"], ["Анна", ""]]), rules);

    expect(errors.group).toBeUndefined();
    expect(errors.participants[1]?.age).toBe("Укажите возраст");
  });
});

describe("toOrderRequest", () => {
  it("обрезает пробелы и переводит возраст в число", () => {
    const request = toOrderRequest(form([["  Анна ", " 35 "]], "  buyer@mail.ru "));

    expect(request).toEqual({
      email: "buyer@mail.ru",
      participants: [{ name: "Анна", age: 35 }],
    });
  });

  it("не принимает невалидный возраст", () => {
    expect(() => toOrderRequest(form([["Анна", "abc"]]))).toThrow();
  });
});

describe("formErrorsFromServer", () => {
  it("раскладывает пути полей по участникам", () => {
    const error = new ValidationError("validation_error", "Проверьте данные", [
      { field: "email", message: "bad" },
      { field: "participants.1.name", message: "bad" },
      { field: "participants.0.age", message: "bad" },
    ]);

    const errors = formErrorsFromServer(error, 2, rules);

    expect(errors.email).toBeDefined();
    expect(errors.participants[0]).toEqual({ age: "Проверьте возраст" });
    expect(errors.participants[1]).toEqual({ name: "Проверьте имя" });
  });

  it("ошибка правила состава превращается в групповую", () => {
    const error = new ValidationError("child_requires_adult", "нужен взрослый", []);

    const errors = formErrorsFromServer(error, 1, rules);

    expect(errors.group).toMatch(/Дети младше 14 лет/);
  });

  it("неизвестный путь (например, число участников) → групповая ошибка", () => {
    const error = new ValidationError("validation_error", "x", [
      { field: "participants", message: "too many" },
    ]);

    expect(formErrorsFromServer(error, 5, rules).group).toBe("Проверьте состав заказа");
  });
});
