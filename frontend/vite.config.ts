import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Адрес бэкенда для dev-режима: запросы /api проксируются, поэтому CORS не нужен
const apiTarget = process.env.VITE_API_PROXY ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { "/api": apiTarget },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
