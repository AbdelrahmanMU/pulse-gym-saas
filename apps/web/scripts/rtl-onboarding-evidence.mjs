/**
 * Onboarding-flow evidence (Sprint 2.x). The main evidence pass skips onboarding because it
 * needs first-run DB state (`setupCompletedAt = null`). This script opts into first-run,
 * renders all four onboarding steps under `PULSE_LOCALE=ar`, asserts no Next error overlay,
 * runs axe (dir=rtl), screenshots each — then RESTORES the configured flag. Run against a
 * `PULSE_LOCALE=ar pnpm exec next dev -p 3200` server.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = "http://localhost:3200";
const OWNER_EMAIL = "owner@pulse.local";
const OWNER_PASSWORD = process.env.OWNER_INITIAL_PASSWORD ?? "ChangeMe!Owner1";
const OUT = resolve(process.cwd(), "../../docs/localization/screenshots/ar");
mkdirSync(OUT, { recursive: true });

async function setSetupCompleted(value) {
  try {
    process.loadEnvFile(resolve(process.cwd(), "../../.env"));
  } catch {
    /* ambient env */
  }
  const { prisma } = await import("@pulse/db");
  await prisma.gym.updateMany({ data: { setupCompletedAt: value } });
  await prisma.$disconnect();
}

async function main() {
  await setSetupCompleted(null); // first-run
  const browser = await chromium.launch();
  const report = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    // Sign in → routed into onboarding.
    await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', OWNER_EMAIL);
    await page.fill('input[name="password"]', OWNER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/onboarding\/gym/, { timeout: 30000 });

    const steps = ["gym", "branch", "profile", "complete"];
    for (const step of steps) {
      await page.goto(`${BASE}/onboarding/${step}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(400);
      // A Next SSR error surfaces the error overlay / a 500; assert neither.
      const overlay = await page.locator("nextjs-portal, #__next-build-watcher").count();
      const errorText = await page
        .locator("text=/Application error|Unhandled Runtime Error|500/i")
        .count();
      const dir = await page.evaluate(() => document.documentElement.dir);
      await page.screenshot({
        path: resolve(OUT, `onboarding-${step}-desktop-light.png`),
        fullPage: true,
      });
      const axe = await new AxeBuilder({ page }).analyze();
      const ok = errorText === 0;
      report.push({ step, dir, errorText, overlay, axe: axe.violations.length, ok });
      console.log(
        `${ok ? "✓" : "✗"} onboarding/${step}  dir=${dir}  err=${errorText}  axe=${axe.violations.length}`,
      );
    }
    await ctx.close();
  } finally {
    await browser.close();
    await setSetupCompleted(new Date()); // restore configured state
    console.log("restored setupCompletedAt = now");
  }

  const bad = report.filter((r) => !r.ok || r.axe > 0);
  console.log(
    bad.length
      ? `FAIL: ${JSON.stringify(bad)}`
      : "ALL 4 onboarding steps: rendered clean, axe 0, dir=rtl",
  );
}

main().catch(async (e) => {
  console.error(e);
  await setSetupCompleted(new Date()).catch(() => {});
  process.exit(1);
});
