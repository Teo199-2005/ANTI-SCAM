import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.NEXT_PUBLIC_E2E_BASE_URL ?? "http://localhost:3000",
  },
});
