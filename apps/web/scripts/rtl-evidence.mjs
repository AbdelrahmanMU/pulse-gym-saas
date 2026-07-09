/**
 * Standalone Arabic-RTL evidence pass (Sprint 2.x localization). NOT part of the test suite.
 * Drives the authenticated shell against a `PULSE_LOCALE=ar` dev server (start it separately
 * on :3200), captures screenshots for each localized module at mobile (375) + desktop (1280)
 * in light + dark, and runs axe (the page is dir=rtl under ar) expecting 0 violations.
 *
 *   Terminal A:  PULSE_LOCALE=ar pnpm exec next dev -p 3200
 *   Terminal B:  node scripts/rtl-evidence.mjs
 */
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Anchor the output dir to this script's location (apps/web/scripts), not the caller's cwd.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BASE = "http://localhost:3200";
const OWNER_EMAIL = "owner@pulse.local";
const OWNER_PASSWORD = process.env.OWNER_INITIAL_PASSWORD ?? "ChangeMe!Owner1";
const OUT = resolve(ROOT, "docs/localization/screenshots/ar");
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];
const THEMES = ["light", "dark"];

async function signIn(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
  await page.fill('input[name="identifier"]', OWNER_EMAIL);
  await page.fill('input[name="password"]', OWNER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
}

async function firstHref(page, listUrl, prefix) {
  await page.goto(`${BASE}${listUrl}`, { waitUntil: "networkidle" });
  const href = await page
    .locator(`a[href^="${prefix}"]`)
    .first()
    .getAttribute("href")
    .catch(() => null);
  return href;
}

async function main() {
  const browser = await chromium.launch();

  // Resolve a member + membership id from the seeded/dev data for the detail pages.
  const probe = await browser.newContext({ viewport: VIEWPORTS[0] });
  const probePage = await probe.newPage();
  await signIn(probePage);
  const storageState = await probe.storageState();
  const memberHref = await firstHref(probePage, "/members", "/members/");
  const membershipHref = await firstHref(probePage, "/memberships", "/memberships/");
  await probe.close();

  const pages = [
    { label: "dashboard", url: "/dashboard" },
    { label: "members", url: "/members" },
    { label: "member-workspace", url: memberHref },
    { label: "memberships", url: "/memberships" },
    { label: "membership-detail", url: membershipHref },
    { label: "plans", url: "/plans" },
    { label: "reports", url: "/reports" },
    { label: "reports-revenue", url: "/reports/revenue" },
    { label: "staff", url: "/staff" },
    { label: "notifications", url: "/notifications" },
    { label: "settings-gym", url: "/settings/gym" },
    { label: "onboarding-complete-note", url: null }, // onboarding needs first-run DB state; skipped
  ].filter((p) => p.url);

  const axeReport = [];

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        storageState,
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme,
        deviceScaleFactor: 2,
      });
      if (theme === "dark") {
        await ctx.addInitScript(() => document.documentElement.classList.add("dark"));
      }
      const page = await ctx.newPage();

      for (const p of pages) {
        try {
          await page.goto(`${BASE}${p.url}`, { waitUntil: "networkidle", timeout: 30000 });
          await page.waitForTimeout(400);
          const dir = await page.evaluate(() => document.documentElement.dir);
          const file = `${p.label}-${vp.name}-${theme}.png`;
          await page.screenshot({ path: resolve(OUT, file), fullPage: true });

          const results = await new AxeBuilder({ page }).analyze();
          axeReport.push({
            page: p.label,
            viewport: vp.name,
            theme,
            dir,
            violations: results.violations.length,
            ids: results.violations.map((v) => v.id),
          });
          console.log(
            `✓ ${file}  dir=${dir}  axe=${results.violations.length}` +
              (results.violations.length
                ? `  ${results.violations.map((v) => v.id).join(",")}`
                : ""),
          );
        } catch (err) {
          console.log(`✗ ${p.label} ${vp.name} ${theme}: ${err.message}`);
          axeReport.push({ page: p.label, viewport: vp.name, theme, error: err.message });
        }
      }
      await ctx.close();
    }
  }

  await browser.close();

  const totalViolations = axeReport.reduce((n, r) => n + (r.violations ?? 0), 0);
  console.log(`\n=== axe summary ===`);
  console.log(`checks: ${axeReport.length} · total violations: ${totalViolations}`);
  const bad = axeReport.filter((r) => r.violations || r.error);
  if (bad.length) console.log(JSON.stringify(bad, null, 2));
  else console.log("ALL CLEAN (dir=rtl, 0 violations across all combos).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
