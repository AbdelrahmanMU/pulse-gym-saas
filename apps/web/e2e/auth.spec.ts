import { resolve } from "node:path";
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
const IDENTIFIER_LABEL = "Phone number or email";

/**
 * The owner's phone is read from the dev DB, not assumed: the seed sets a default
 * only when no phone exists and PRESERVES an edited one, so the database is the
 * single source of truth for what the receptionist would actually type.
 */
async function ownerPhone(): Promise<string> {
  try {
    process.loadEnvFile(resolve(process.cwd(), "../../.env"));
  } catch {
    /* ambient env */
  }
  const { prisma } = await import("@pulse/db");
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: OWNER_EMAIL } });
  await prisma.$disconnect();
  if (!owner.phone) throw new Error("Seeded owner has no phone — run `pnpm db:seed` first.");
  return owner.phone;
}

test("unauthenticated access to a protected route redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});

test("the sign-in page renders the credentials form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByLabel(IDENTIFIER_LABEL)).toBeVisible();
  await expect(page.getByLabel(/^Password/)).toBeVisible();
});

test("the password toggle reveals and re-masks without losing the value", async ({ page }) => {
  await page.goto("/sign-in");
  const password = page.getByLabel(/^Password/);
  await password.fill("s3cret-value");
  await expect(password).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("s3cret-value");

  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test("invalid credentials show a generic error and stay on sign-in", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel(IDENTIFIER_LABEL).fill(OWNER_EMAIL);
  await page.getByLabel(/^Password/).fill("definitely-not-the-password");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByText(/invalid sign-in details/i)).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});

test("Owner signs in by phone (typed with spaces) and reaches the dashboard", async ({ page }) => {
  // The receptionist reality: the owner's real phone typed the human way, with spaces.
  const phone = await ownerPhone();
  const spaced = `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  await page.goto("/sign-in");
  await page.getByLabel(IDENTIFIER_LABEL).fill(spaced);
  await page.getByLabel(/^Password/).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
});

test("Owner signs in, reaches the gated dashboard, and signs out", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel(IDENTIFIER_LABEL).fill(OWNER_EMAIL);
  await page.getByLabel(/^Password/).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Permission-gated dashboard renders inside the Application Shell (Owner holds
  // dashboard.view). The page title is the single <h1> via PageHeader.
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

  // The signed-in user's email lives in the TopBar user menu; open it to reveal it,
  // then sign out (a proper menuitem). Sign-out returns to the public sign-in route.
  await page.getByRole("button", { name: /user menu/i }).click();
  await expect(page.getByText(new RegExp(OWNER_EMAIL))).toBeVisible();
  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/sign-in/);
});
