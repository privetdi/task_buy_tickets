import { describe, expect, it } from "vitest";

import {
  ageWord,
  formatDateTime,
  formatMoney,
  participantsWord,
  plural,
  seatsWord,
} from "./format";

describe("formatMoney", () => {
  it.each([
    [0, "0 ₽"],
    [999, "999 ₽"],
    [1000, "1 000 ₽"],
    [2000, "2 000 ₽"],
    [5000, "5 000 ₽"],
    [1234567, "1 234 567 ₽"],
  ])("%i → %s", (amount, expected) => {
    expect(formatMoney(amount)).toBe(expected);
  });
});

describe("plural", () => {
  it.each([
    [0, "мест"],
    [1, "место"],
    [2, "места"],
    [4, "места"],
    [5, "мест"],
    [11, "мест"],
    [12, "мест"],
    [14, "мест"],
    [21, "место"],
    [22, "места"],
    [100, "мест"],
    [101, "место"],
  ])("%i → %s", (n, expected) => {
    expect(seatsWord(n)).toBe(expected);
  });

  it("возраст: 1 год, 2 года, 14 лет, 18 лет", () => {
    expect([1, 2, 14, 18, 21].map(ageWord)).toEqual(["год", "года", "лет", "лет", "год"]);
  });

  it("участники: 1 участник, 2 участника, 5 участников", () => {
    expect([1, 2, 4, 5].map(participantsWord)).toEqual([
      "участник",
      "участника",
      "участника",
      "участников",
    ]);
  });

  it("принимает любые формы слова", () => {
    expect(plural(3, "a", "b", "c")).toBe("b");
  });
});

describe("formatDateTime", () => {
  it("форматирует дату и время в заданном часовом поясе", () => {
    const text = formatDateTime("2026-11-21T16:00:00Z", "Europe/Moscow");

    expect(text).toContain("21 ноября 2026");
    expect(text).toContain("19:00");
  });
});
