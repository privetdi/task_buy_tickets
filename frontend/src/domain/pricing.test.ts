import { describe, expect, it } from "vitest";

import { rules } from "../test/fixtures";
import { escortRuleViolated, summarize, ticketPrice, ticketTypeFor } from "./pricing";

describe("ticketTypeFor", () => {
  it.each([
    [0, "child"],
    [13, "child"],
    [14, "full"],
    [17, "full"],
    [18, "full"],
    [120, "full"],
  ] as const)("возраст %i → %s", (age, expected) => {
    expect(ticketTypeFor(age, rules)).toBe(expected);
  });
});

describe("ticketPrice", () => {
  it("цены берутся из правил API", () => {
    expect(ticketPrice("full", rules)).toBe(2000);
    expect(ticketPrice("child", rules)).toBe(1000);
  });
});

describe("summarize", () => {
  it.each([
    [[35, 33, 8], 5000],
    [[20], 2000],
    [[40, 10], 3000],
    [[14, 14, 14, 14], 8000],
    [[], 0],
  ] as const)("возрасты %j → итог %i", (ages, total) => {
    expect(summarize([...ages], rules).total).toBe(total);
  });

  it("считает билеты каждого типа", () => {
    expect(summarize([35, 33, 8], rules).counts).toEqual({ full: 2, child: 1 });
  });

  it("смена возраста с 13 на 14 увеличивает итог на 1000", () => {
    expect(summarize([30, 14], rules).total - summarize([30, 13], rules).total).toBe(1000);
  });
});

describe("escortRuleViolated", () => {
  it.each([
    [[10], true],
    [[10, 17], true],
    [[5, 13, 16], true],
    [[10, 18], false],
    [[3, 5, 9, 40], false],
    [[14], false],
    [[14, 17], false],
    [[30, 31], false],
  ] as const)("возрасты %j → нарушено: %s", (ages, violated) => {
    expect(escortRuleViolated([...ages], rules)).toBe(violated);
  });

  it("граница сопровождения берётся из правил API", () => {
    // Если бы «ребёнком» считали всех младше 18, подросток 17 лет тоже требовал бы взрослого
    const strict = { ...rules, escort_required_below_age: 18 };

    expect(escortRuleViolated([17], strict)).toBe(true);
    expect(escortRuleViolated([17], rules)).toBe(false);
  });
});
