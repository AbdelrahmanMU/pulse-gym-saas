import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Gym Initialization — first-run onboarding E2E (Sprint-1 Epic-1). Verifies the complete
 * guided experience the Epic mandates: Login → Gym → Branch → Owner Profile → Success
 * (completion state) → Dashboard. Opts into the first-run state (`setupCompletedAt = null`)
 * before the flow and restores "configured" afterward so other specs are unaffected.
 */
const OWNER_EMAIL = "owner@pulse.local";
const OWNER_PASSWORD = process.env.OWNER_INITIAL_PASSWORD ?? "ChangeMe!Owner1";

async function setSetupCompleted(value: Date | null): Promise<void> {
  try {
    process.loadEnvFile(resolve(process.cwd(), "../../.env"));
  } catch {
    /* ambient env */
  }
  const { prisma } = await import("@pulse/db");
  await prisma.gym.updateMany({ data: { setupCompletedAt: value } });
  await prisma.$disconnect();
}

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(OWNER_EMAIL);
  await page.getByLabel("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.beforeAll(async () => {
  await setSetupCompleted(null); // first-run
});
test.afterAll(async () => {
  await setSetupCompleted(new Date()); // restore configured state for other specs
});

test("a setup-needed owner is guided through onboarding to a ready gym", async ({ page }) => {
  await signIn(page);

  // Login → routed into onboarding (step 1: Gym).
  await expect(page).toHaveURL(/\/onboarding\/gym/);
  await expect(page.getByText(/step 1 of 3/i)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByLabel("Gym name").fill("Pulse First Gym");
  await page.getByRole("button", { name: /save & continue/i }).click();

  // Step 2: Branch.
  await expect(page).toHaveURL(/\/onboarding\/branch/);
  await expect(page.getByText(/step 2 of 3/i)).toBeVisible();
  await page.getByLabel("Branch name").fill("HQ");
  await page.getByRole("button", { name: /save & continue/i }).click();

  // Step 3: Owner profile.
  await expect(page).toHaveURL(/\/onboarding\/profile/);
  await expect(page.getByText(/step 3 of 3/i)).toBeVisible();
  await page.getByLabel("Display name").fill("Pat Owner");
  await page.getByRole("button", { name: /save & continue/i }).click();

  // Completion state, then to the dashboard.
  await expect(page).toHaveURL(/\/onboarding\/complete/);
  await expect(page.getByRole("heading", { name: /your gym is ready/i })).toBeVisible();
  await page.getByRole("button", { name: /go to dashboard/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
});
