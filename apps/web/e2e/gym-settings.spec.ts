import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Gym Initialization — settings pages E2E (Sprint-1 Epic-1). Drives the real signed-in
 * settings surfaces: accessibility (axe), the permission-gated Settings nav, and a gym
 * settings save round-trip. The e2e gym is "already set up" (global-setup), so sign-in
 * lands on the dashboard and the settings pages are reached via the nav.
 */
const OWNER_EMAIL = "owner@pulse.local";
const OWNER_PASSWORD = process.env.OWNER_INITIAL_PASSWORD ?? "ChangeMe!Owner1";

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Phone number or email").fill(OWNER_EMAIL);
  await page.getByLabel("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  // Settle on the rendered dashboard (not its loading skeleton) before assertions.
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
}

test("the Settings nav exposes Gym, Branch, and My Profile", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("link", { name: "Gym" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Branch" })).toBeVisible();
  await expect(page.getByRole("link", { name: "My Profile" })).toBeVisible();
});

test("gym settings page has no axe violations and saves changes", async ({ page }) => {
  await signIn(page);
  await page.goto("/settings/gym");
  await expect(page.getByRole("heading", { level: 1, name: "Gym settings" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.getByLabel("Gym name").fill("PULSE Downtown");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText(/gym settings saved/i)).toBeVisible();
});

test("branch and profile settings pages have no axe violations", async ({ page }) => {
  await signIn(page);

  await page.goto("/settings/branch");
  await expect(page.getByRole("heading", { level: 1, name: "Branch" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.goto("/settings/profile");
  await expect(page.getByRole("heading", { level: 1, name: "My profile" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("server-side validation rejects a blank (whitespace) gym name", async ({ page }) => {
  await signIn(page);
  await page.goto("/settings/gym");
  // Whitespace passes the native `required` attribute but fails the server Zod
  // `.trim().min(1)` — proving the server-side validation backstop.
  await page.getByLabel("Gym name").fill("   ");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText(/gym name is required/i)).toBeVisible();
});
