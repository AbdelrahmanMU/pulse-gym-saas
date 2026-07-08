import { expect, test, type Page } from "@playwright/test";

/**
 * Membership lifecycle + payment actions — regression coverage for the production-only
 * pending-state deadlock found in the Performance Recovery sprint: a successful action whose
 * response re-rendered the current page in place left the submit button on its pending label
 * forever (React's transition suspended; see modules/memberships/actions.ts). The fix: those
 * actions return plain results and the forms leave via a full-document navigation
 * (`useFullNavigationOnSuccess`). Every action here must LEAVE the pending state and land on
 * the post-action UI — bounded `expect` timeouts turn a hang into a failure.
 *
 * The spec builds its own member + membership through the real UI, then drives freeze →
 * resume → record payment → void payment → renew (successor) → cancel (successor) →
 * schedule upgrade (new successor).
 *
 * NOTE: the deadlock only reproduced against a production build (`next build && next start`);
 * against the dev server this spec still asserts the flows complete, just without the
 * regression-provoking conditions. Run it against a production server to re-verify the fix.
 */
const OWNER_EMAIL = "owner@pulse.local";
const OWNER_PASSWORD = process.env.OWNER_INITIAL_PASSWORD ?? "ChangeMe!Owner1";

/** Generous bound: a deadlocked action never settles, a healthy one settles in <1s. */
const SETTLE = { timeout: 15_000 };

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Phone number or email").fill(OWNER_EMAIL);
  await page.getByLabel(/^Password/).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
}

test("lifecycle and payment actions all leave the pending state", async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page);

  // ── Setup: a fresh member with an ACTIVE membership, built through the real UI ──
  const memberName = `Lifecycle E2E ${Date.now()}`;
  const phone = `01${(Date.now() % 1_000_000_000).toString().padStart(9, "0")}`;
  await page.goto("/members/new");
  await page.getByLabel(/^Full name/).fill(memberName);
  await page.getByLabel(/^Phone/).fill(phone);
  await page.locator("main form button[type=submit]").locator("visible=true").first().click();
  await expect(page).toHaveURL(/\/members\/[0-9a-f-]+$/, SETTLE);

  await page.goto("/memberships/new");
  const memberOption = page.locator('select[name="memberId"] option', { hasText: memberName });
  await expect(memberOption).toHaveCount(1);
  await page
    .locator('select[name="memberId"]')
    .selectOption((await memberOption.getAttribute("value")) ?? "");
  const planValues = await page
    .locator('select[name="planId"] option')
    .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
  expect(planValues.length).toBeGreaterThan(1);
  await page.locator('select[name="planId"]').selectOption(planValues[0] ?? "");
  await page.locator("main form button[type=submit]").locator("visible=true").first().click();
  await expect(page).toHaveURL(/\/memberships\/[0-9a-f-]+$/, SETTLE);
  const originalUrl = new URL(page.url()).pathname;

  // ── Freeze: pending must resolve into the FROZEN page (full reload, same URL) ──
  await page.getByLabel("Freeze for (days)").fill("3");
  await page.getByRole("button", { name: "Freeze membership" }).click();
  await expect(page.getByRole("button", { name: "Resume membership" })).toBeVisible(SETTLE);
  await expect(page.getByRole("button", { name: "Freezing…" })).toHaveCount(0);

  // ── Resume: the freeze form must come back ──
  await page.getByRole("button", { name: "Resume membership" }).click();
  await expect(page.getByLabel("Freeze for (days)")).toBeVisible(SETTLE);
  await expect(page.getByRole("button", { name: "Resuming…" })).toHaveCount(0);

  // ── Record payment: the ledger row must appear ──
  await page.getByLabel("Amount").fill("123.45");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("123.45").first()).toBeVisible(SETTLE);
  await expect(page.getByRole("button", { name: "Recording…" })).toHaveCount(0);

  // ── Void payment: settle on the post-reload "Voided" badge (not the transient DOM
  // during the full-document navigation, or the next click lands on a dying page) ──
  await page.getByRole("button", { name: "Void payment" }).first().click();
  await expect(page.getByText("Voided").first()).toBeVisible(SETTLE);
  await expect(page.getByRole("button", { name: "Void payment" })).toHaveCount(0);

  // ── Renew: navigates to the successor membership's detail page ──
  await page.getByRole("button", { name: "Renew membership" }).click();
  await expect(page).not.toHaveURL(new RegExp(`${originalUrl}$`), SETTLE);
  await expect(page).toHaveURL(/\/memberships\/[0-9a-f-]+$/, SETTLE);
  const successorUrl = new URL(page.url()).pathname;
  expect(successorUrl).not.toBe(originalUrl);

  // ── Cancel (the scheduled successor): pending must resolve into the CANCELLED page ──
  await page.getByRole("button", { name: "Cancel membership" }).click();
  await expect(page.getByRole("button", { name: "Cancel membership" })).toHaveCount(0, SETTLE);
  await expect(page.getByRole("button", { name: "Cancelling…" })).toHaveCount(0);

  // ── Upgrade (on the original, ACTIVE again): schedules a change → new successor page ──
  await page.goto(originalUrl);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.locator('select[name="planId"]').selectOption(planValues[1] ?? planValues[0] ?? "");
  await page.getByRole("button", { name: "Schedule upgrade / downgrade" }).click();
  await expect(page).not.toHaveURL(new RegExp(`${originalUrl}$`), SETTLE);
  await expect(page).toHaveURL(/\/memberships\/[0-9a-f-]+$/, SETTLE);
  expect(new URL(page.url()).pathname).not.toBe(originalUrl);
});
