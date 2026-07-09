import { resolve } from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 configuration (now owned by @pulse/db — T-09). The datasource
// connection URL lives here, not in schema.prisma. Paths are relative to this
// file's directory (packages/db). See /docs/database/prisma-7-strategy.md.
//
// Prisma 7 does not auto-load `.env` when a config file is present, so we load
// the monorepo-root `.env` (single source of truth) into `process.env` here —
// Node 20.12+ built-in, no `dotenv` dependency. A missing file is tolerated so
// CI/hosts that inject real env vars work without one.
try {
  process.loadEnvFile(resolve(import.meta.dirname, "../../.env"));
} catch {
  // No root .env — rely on the ambient environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Seed runs the compiled seed (tsc → dist/seed.js); no `tsx`/`ts-node` dep.
    seed: "node --env-file=../../.env dist/seed.js",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
