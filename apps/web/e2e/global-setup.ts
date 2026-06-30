import { resolve } from "node:path";

/**
 * Playwright global setup (Sprint-1 Epic-1). The seeded gym starts with
 * `setupCompletedAt = null` (first-run → onboarding), which would otherwise redirect the
 * post-login dashboard tests into the onboarding flow. We mark the e2e tenant as
 * **already configured** so the existing dashboard/shell specs land on `/dashboard`; the
 * dedicated onboarding spec opts back into the first-run state for its own flow.
 *
 * Loads the root `.env` before importing the Prisma singleton (which reads DATABASE_URL
 * at construction), mirroring the integration setup.
 */
export default async function globalSetup(): Promise<void> {
  try {
    process.loadEnvFile(resolve(process.cwd(), "../../.env"));
  } catch {
    // Rely on ambient env (CI) if no root .env.
  }
  const { prisma } = await import("@pulse/db");
  await prisma.gym.updateMany({ data: { setupCompletedAt: new Date() } });
  await prisma.$disconnect();
}
