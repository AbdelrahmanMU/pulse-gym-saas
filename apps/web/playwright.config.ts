import { defineConfig, devices } from "@playwright/test";

// E2E smoke config (T-23). Boots the app and loads the placeholder route; axe-core
// runs the a11y baseline inside the spec. Playwright starts the dev server (which
// loads the root .env via next.config.ts) and reuses an already-running one.
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  // Mark the seeded e2e gym as already set up so post-login lands on the dashboard
  // (the onboarding spec opts back into first-run for its own flow). Sprint-1 Epic-1.
  globalSetup: "./e2e/global-setup.ts",
  // Serial, single-worker: the suite runs against `next dev`, which compiles routes
  // on first request. Parallel workers hitting cold routes simultaneously race the
  // compile and flake; one worker keeps the gate deterministic (the suite is small).
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
