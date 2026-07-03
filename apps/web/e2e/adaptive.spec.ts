import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * v1.2 Adaptive verification (DD-10 — closes RC TD-7). Extends the e2e + axe gate to the
 * module pages AND the new adaptive behaviors at the mobile viewport: DataTable card mode
 * (AP-1), FilterSheet (AP-3), CreationFAB + StickyMobileActionBar (AP-6), operational-first
 * ordering (AP-2/AP-5), and the DD-11 nav fix. Mobile = 375×800 (<md), desktop = 1280×900.
 * Requires the dev DB seeded with the real Owner (Session 3).
 */
const OWNER_EMAIL = "owner@pulse.local";
const OWNER_PASSWORD = process.env.OWNER_INITIAL_PASSWORD ?? "ChangeMe!Owner1";

const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 900 };

/** Module pages under the a11y gate (each is axe-scanned at both viewports). */
const MODULE_PAGES = [
  "/members",
  "/memberships",
  "/plans",
  "/staff",
  "/notifications",
  "/reports",
  "/reports/outstanding",
  "/settings/gym",
];

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(OWNER_EMAIL);
  await page.getByLabel("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function expectAxeClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test.describe("module-page a11y (DD-10 / RC TD-7)", () => {
  for (const path of MODULE_PAGES) {
    test(`${path} has no axe violations at mobile and desktop`, async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await signIn(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectAxeClean(page);

      await page.setViewportSize(DESKTOP);
      await expectAxeClean(page);
    });
  }

  test("members page has no axe violations in dark mode at mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await signIn(page);
    await page.goto("/members");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await expectAxeClean(page);
  });
});

test.describe("adaptive behaviors (v1.2)", () => {
  test("register a member one-handed: FAB → 16px inputs → sticky submit (J-2)", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE);
    await signIn(page);
    await page.goto("/members");

    // CreationFAB is the thumb-zone create entry on mobile (AP-6/§12.2)…
    const fab = page.getByRole("link", { name: "Add member" }).last();
    await expect(fab).toBeVisible();
    const fabBox = await fab.boundingBox();
    // …anchored in the thumb zone (bottom third of the viewport).
    expect(fabBox && fabBox.y).toBeGreaterThan((MOBILE.height / 3) * 2);
    await fab.click();
    await expect(page).toHaveURL(/\/members\/new/);

    // DD-2: inputs render ≥16px below md so iOS Safari never focus-zooms.
    const nameInput = page.getByLabel(/full name/i);
    const fontSize = await nameInput.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);

    // DD-3: the submit action is pinned inside the viewport while the form top is visible.
    const submit = page.getByRole("button", { name: /add member/i });
    const submitBox = await submit.boundingBox();
    expect(submitBox && submitBox.y + submitBox.height).toBeLessThanOrEqual(MOBILE.height);

    // Complete the journey: the form submits and lands on the member profile.
    // (A member needs at least one contact method — validation rule.) The contact is
    // unique per run: phone is partial-unique per gym (INV-3), so a fixed value would
    // make the suite one-shot per database — the second full run used to fail on it.
    const runId = Date.now().toString().slice(-9);
    const memberName = `Adaptive E2E ${runId}`;
    await nameInput.fill(memberName);
    await page.getByLabel(/phone/i).fill(`01${runId}`);
    await submit.click();
    await expect(page.getByRole("heading", { level: 1, name: memberName })).toBeVisible();

    // DD-9: the profile's P0 standing strip renders (composition-only membership standing).
    await expect(
      page.getByText("No live membership").or(page.getByText("Active membership")).first(),
    ).toBeVisible();

    // The profile primary actions are pinned in the mobile thumb zone (§12.3 detail variant).
    const sell = page.getByRole("link", { name: /sell membership/i }).last();
    await expect(sell).toBeVisible();
    const sellBox = await sell.boundingBox();
    expect(sellBox && sellBox.y + sellBox.height).toBeLessThanOrEqual(MOBILE.height);
  });

  test("members list renders cards below md and the table above md (AP-1)", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await signIn(page);
    await page.goto("/members");

    // Card list visible, table hidden (<md).
    const cardList = page.getByRole("list", { name: "Members" });
    await expect(cardList).toBeVisible();
    await expect(cardList.getByRole("listitem").first()).toBeVisible();
    await expect(page.getByRole("table")).toBeHidden();

    // No horizontal scroll at 375 — the core DD-1 readability guarantee.
    const overflow = await page.evaluate(
      () => (document.scrollingElement?.scrollWidth ?? 0) - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // ≥md: the dense table returns, the card list goes away.
    await page.setViewportSize(DESKTOP);
    await expect(page.getByRole("table")).toBeVisible();
    await expect(cardList).toBeHidden();
  });

  test("filters open in a bottom sheet on mobile with focus return (AP-3)", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await signIn(page);
    await page.goto("/members");

    const trigger = page.getByRole("button", { name: /filters/i });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByLabel("Filter by status")).toBeVisible();

    // The same control applies the same URL contract as the desktop inline filter.
    await sheet.getByLabel("Filter by status").selectOption("ALL");
    await expect(page).toHaveURL(/status=ALL/);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();

    // Desktop keeps the inline filter — no Filters trigger, no sheet (unchanged workflow).
    await page.setViewportSize(DESKTOP);
    await expect(page.getByRole("button", { name: /filters/i })).toBeHidden();
    await expect(page.getByLabel("Filter by status")).toBeVisible();
  });

  test("FAB and mobile primaries are hidden on desktop (AP-6 parity)", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page);
    await page.goto("/members");
    // Exactly one create primary on desktop: the inline toolbar button.
    const inline = page.getByRole("link", { name: "Add member" });
    await expect(inline).toHaveCount(1);
    await expect(inline).toBeVisible();
  });

  test("dashboard leads with the urgent KPIs (AP-2 / DD-8)", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await signIn(page);
    // The first two StatCards are the urgent pair — before any population/revenue card.
    const labels = page.locator("main").getByText(/Expiring Soon|Expired|Active Members/);
    await expect(labels.nth(0)).toHaveText(/Expiring Soon/);
    await expect(labels.nth(1)).toHaveText(/Expired/);
  });

  test("membership detail stacks Billing and Actions first on mobile (AP-5 / DD-9)", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE);
    await signIn(page);
    await page.goto("/memberships");
    const firstMembership = page
      .getByRole("list", { name: "Memberships" })
      .getByRole("link")
      .first();
    // Only meaningful when the dev DB has a live membership; skip cleanly otherwise.
    if ((await firstMembership.count()) === 0) test.skip();
    await firstMembership.click();
    await expect(page).toHaveURL(/\/memberships\//);

    const headings = page.locator("main section h2");
    await expect(headings.first()).toHaveText(/Billing|Actions|Period/);
    // The audit timeline is always last in the operational-first order.
    await expect(headings.last()).toHaveText(/Lifecycle timeline/);
  });

  test("the nav offers no Payments placeholder (DD-11 / RC TD-15)", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await signIn(page);
    await page.getByRole("button", { name: /open navigation/i }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Payments")).toHaveCount(0);
    await expect(drawer.getByRole("link", { name: "Members", exact: true })).toBeVisible();
  });
});
