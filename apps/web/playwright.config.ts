import { defineConfig, devices } from "@playwright/test";

// E2E smoke config (T-23). Boots the app and loads the placeholder route; axe-core
// runs the a11y baseline inside the spec. Playwright starts the dev server (which
// loads the root .env via next.config.ts) and reuses an already-running one.
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
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
