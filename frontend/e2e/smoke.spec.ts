import { test, expect } from "@playwright/test";

/**
 * Minimal smoke test for CI/local — requires:
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *   NEXT_PUBLIC_E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 */
test.describe("Marketing smoke", () => {
  test.skip(!process.env.NEXT_PUBLIC_E2E_BASE_URL, "Set NEXT_PUBLIC_E2E_BASE_URL to run E2E");

  test("home page loads", async ({ page }) => {
    const base = process.env.NEXT_PUBLIC_E2E_BASE_URL ?? "http://localhost:3000";
    await page.goto(base);
    await expect(page).toHaveTitle(/Anti-Scam|Resort/i);
  });
});
