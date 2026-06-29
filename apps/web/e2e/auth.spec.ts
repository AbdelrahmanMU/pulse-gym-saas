import { expect, test } from "@playwright/test";

/**
 * Authentication & route-protection E2E (T-19/T-07). Exercises the **real** Auth.js
 * round-trip the unit/integration suites cannot: the sign-in server action, the
 * jwt→session principal, the cookie, and the `(app)` layout protection +
 * `requireSession` redirect. Requires the dev database seeded with the real Owner
 * scrypt hash (OWNER_INITIAL_PASSWORD; the seed sets it, replacing the placeholder).
 */
const OWNER_EMAIL = "owner@pulse.local";
const OWNER_PASSWORD = process.env.OWNER_INITIAL_PASSWORD ?? "ChangeMe!Owner1";

test("unauthenticated access to a protected route redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});

test("the sign-in page renders the credentials form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("invalid credentials show a generic error and stay on sign-in", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(OWNER_EMAIL);
  await page.getByLabel("Password").fill("definitely-not-the-password");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});

test("Owner signs in, reaches the gated dashboard, and signs out", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(OWNER_EMAIL);
  await page.getByLabel("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Permission-gated placeholder renders (Owner holds dashboard.view).
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(new RegExp(OWNER_EMAIL))).toBeVisible();

  // Sign out returns to the public sign-in route.
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/sign-in/);
});
