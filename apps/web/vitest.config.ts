import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Unit + architectural-fitness suite (T-23 / T-27). Runs in a Node environment
// and needs NO database — it is the fast suite executed by `turbo run test`.
// Database-backed integration tests live in vitest.integration.config.ts.
export default defineConfig({
  // Mirror the app's `@/*` → `src/*` path alias so unit tests resolve it.
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "fitness/**/*.test.ts"],
    exclude: ["tests/integration/**", "e2e/**", "node_modules/**", ".next/**"],
    // Dummy values so importing the env singleton (which validates on import)
    // does not fail the DB-free unit suite. `parseEnv` is still tested directly.
    env: {
      DATABASE_URL: "postgresql://u:p@localhost:5432/test?schema=public",
      AUTH_SECRET: "unit-test-secret",
    },
  },
});
