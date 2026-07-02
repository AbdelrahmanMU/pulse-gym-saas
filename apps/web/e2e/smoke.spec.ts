import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Public-surface E2E (T-23, re-pointed by Sprint 1.6). The landing and sign-in pages
 * are the app's only unauthenticated surface: both must render the PULSE composition,
 * pass the axe-core baseline, and the landing's single action must reach sign-in.
 */
test("public landing renders, passes axe, and routes to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /operational pulse/i })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole("link", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/sign-in/);
});

test("sign-in page renders the auth card and passes axe", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
