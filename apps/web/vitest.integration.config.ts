import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Integration suite (T-23): runs through real server code against the isolated,
// containerized test database (docker compose --profile test up). Separate from
// the fast DB-free unit suite. `globalSetup` migrates + seeds the test DB once;
// `setup.ts` points the Prisma client at it before any module imports it.
export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    fileParallelism: false,
    pool: "forks",
  },
});
