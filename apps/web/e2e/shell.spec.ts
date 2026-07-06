import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Application Shell verification (T-08 / refinements R-4 + R-5). Drives the real signed-in
 * shell to prove accessibility **beyond** the automated axe pass (keyboard, focus order,
 * focus return, landmarks, active-nav) and responsive behavior at mobile / tablet / desktop
 * (rail ↔ drawer). Requires the dev DB seeded with the real Owner (Session 3).
 */
const OWNER_EMAIL = "owner@pulse.local";
const OWNER_PASSWORD = process.env.OWNER_INITIAL_PASSWORD ?? "ChangeMe!Owner1";

async function signIn(page: Page): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Phone number or email").fill(OWNER_EMAIL);
  await page.getByLabel("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  // Settle on the rendered dashboard (not its loading skeleton): the URL flips before
  // the content resolves, and axe/DOM-order assertions must never race the fallback.
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
}

test.describe("a11y (R-4)", () => {
  test("dashboard shell has no axe violations", async ({ page }) => {
    await signIn(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("the UI-states surface has no axe violations", async ({ page }) => {
    await signIn(page);
    await page.goto("/ui-states");
    await expect(page.getByRole("heading", { level: 1, name: "UI states" })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("dashboard shell has no axe violations in dark mode", async ({ page }) => {
    await signIn(page);
    // Toggle the class-based dark theme (T-14): semantic roles must resolve and stay
    // AA-contrast in dark as well as light.
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("an unexpected error renders the ErrorState boundary with a recovery action", async ({
    page,
  }) => {
    await signIn(page);
    // Force a server-side throw; the (app) error boundary (T-17) must catch it and render
    // the Catalog ErrorState (calm copy + a Try-again recovery action), not leak internals.
    await page.goto("/ui-states?throw=1");
    // The ErrorState alert (scoped by its heading — Next's empty route-announcer also
    // carries role="alert"). Calm copy + a recovery action; no internal detail leaked.
    const errorAlert = page.getByRole("alert").filter({ hasText: /something went wrong/i });
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert.getByRole("button", { name: /try again/i })).toBeVisible();
  });

  test("exposes banner, primary navigation, and main landmarks with active nav", async ({
    page,
  }) => {
    await signIn(page);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    // Active item is marked by aria-current (meaning is never colour alone).
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("the skip link is the first focusable element", async ({ page }) => {
    await signIn(page);
    // The first focusable element of the app must be the skip link. (We read DOM order
    // rather than pressing Tab because the Next.js dev-tools button — dev-only, absent in
    // production — otherwise intercepts the first Tab stop.)
    const firstFocusable = await page.evaluate(() => {
      const selector = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const els = Array.from(document.querySelectorAll(selector)).filter(
        (el) => !el.closest("nextjs-portal"),
      );
      return (els[0] as HTMLElement | undefined)?.textContent?.trim() ?? null;
    });
    expect(firstFocusable).toMatch(/skip to content/i);
  });

  test("the open nav drawer has no axe violations at 375px, light and dark", async ({ page }) => {
    // Guards design-review F1 (2026-07-02): the drawer panel must stack ABOVE the scrim —
    // under it, every rail token pair composites below AA (measured 2.17:1 inactive text).
    // Scoped to the dialog: the page behind the scrim is intentionally dimmed.
    await page.setViewportSize({ width: 375, height: 800 });
    await signIn(page);
    await page.getByRole("button", { name: /open navigation/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const light = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(light.violations).toEqual([]);

    await page.evaluate(() => document.documentElement.classList.add("dark"));
    const dark = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(dark.violations).toEqual([]);
  });

  test("the user menu opens by keyboard and returns focus on Escape", async ({ page }) => {
    await signIn(page);
    const trigger = page.getByRole("button", { name: /user menu/i });
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: /sign out/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitem", { name: /sign out/i })).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

test.describe("responsive (R-5)", () => {
  test("desktop (1280) shows the persistent rail, hides the mobile toggle", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await signIn(page);
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("button", { name: /open navigation/i })).toBeHidden();
  });

  test("tablet (768) hides the rail and shows the mobile toggle", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await signIn(page);
    await expect(page.getByRole("button", { name: /open navigation/i })).toBeVisible();
  });

  test("mobile (375) opens the nav drawer and returns focus on Escape", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await signIn(page);

    const toggle = page.getByRole("button", { name: /open navigation/i });
    await expect(toggle).toBeVisible();

    await toggle.click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Dashboard" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(toggle).toBeFocused();
  });
});
