import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Явная очистка DOM между тестами (глобальные хуки vitest не включены)
afterEach(() => {
  cleanup();
});
