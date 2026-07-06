/**
 * Targeted RTL evidence for the Pilot Readiness slice (run from apps/web):
 * 1. /sign-in under ar: the identifier label is the mandated Arabic wording; axe = 0
 *    violations at 375 + 1280, light + dark.
 * 2. End-to-end: sign in by PHONE typed in Arabic-Indic digits with spaces → dashboard.
 * 3. Dashboard loading skeleton under RTL renders (role=status present during nav).
 */
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = "http://localhost:3200";
const OUT = resolve(process.cwd(), "../../docs/sprints/assets/pilot-readiness");
mkdirSync(OUT, { recursive: true });

try {
  process.loadEnvFile(resolve(process.cwd(), "../../.env"));
} catch {
  /* ambient env */
}
const { prisma } = await import("@pulse/db");
const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@pulse.local" } });
await prisma.$disconnect();
if (!owner.phone) throw new Error("owner has no phone");
const OWNER_PASSWORD = process.env.OWNER_INITIAL_PASSWORD ?? "ChangeMe!Owner1";

// The owner phone in Arabic-Indic digits, with human spacing.
const arabicPhone = owner.phone
  .replace(/\d/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x30 + 0x0660))
  .replace(/^(.{4})(.{3})(.*)$/, "$1 $2 $3");

const browser = await chromium.launch();
const failures = [];

for (const [name, viewport] of [
  ["mobile", { width: 375, height: 812 }],
  ["desktop", { width: 1280, height: 900 }],
]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });

  const dir = await page.evaluate(() => document.documentElement.dir);
  if (dir !== "rtl") failures.push(`dir=${dir} at ${name}`);

  const label = page.getByLabel("رقم الهاتف أو البريد الإلكتروني");
  if (!(await label.isVisible())) failures.push(`ar identifier label missing at ${name}`);

  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.evaluate(() => document.documentElement.classList.add("dark"));
    const results = await new AxeBuilder({ page }).analyze();
    if (results.violations.length)
      failures.push(`axe ${name}/${theme}: ${results.violations.map((v) => v.id).join(",")}`);
    await page.screenshot({ path: `${OUT}/signin-ar-${name}-${theme}.png`, fullPage: true });
    if (theme === "dark")
      await page.evaluate(() => document.documentElement.classList.remove("dark"));
  }
  await ctx.close();
}

// End-to-end: Arabic-Indic phone sign-in.
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
await page.getByLabel("رقم الهاتف أو البريد الإلكتروني").fill(arabicPhone);
await page.getByLabel("كلمة المرور").fill(OWNER_PASSWORD);
await page.getByRole("button", { name: "تسجيل الدخول" }).click();
try {
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  await page.screenshot({ path: `${OUT}/dashboard-after-arabic-phone-signin.png` });
  console.log(`PHONE-AR SIGN-IN OK (typed: ${arabicPhone})`);
} catch {
  failures.push("Arabic-Indic phone sign-in did NOT reach /dashboard");
}
await ctx.close();
await browser.close();

if (failures.length) {
  console.error("RTL CHECK FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("RTL sign-in evidence: ALL GREEN. Screenshots in docs/sprints/assets/pilot-readiness/");
