import { execSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * One-time integration setup (T-23): migrate + seed the **isolated test database**
 * (DATABASE_URL_TEST → the containerized `postgres-test` service on :55433). The
 * dev DB is never touched. `loadEnvFile` does not override a pre-set variable, so
 * forcing DATABASE_URL=<test url> in the child env wins over prisma.config.ts.
 */
export default function setup(): void {
  const repoRoot = resolve(import.meta.dirname, "../../../..");
  process.loadEnvFile(resolve(repoRoot, ".env"));

  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) {
    throw new Error("DATABASE_URL_TEST is not set — cannot run integration tests.");
  }

  const dbDir = resolve(repoRoot, "packages/db");
  const childEnv = { ...process.env, DATABASE_URL: testUrl };

  execSync("node node_modules/prisma/build/index.js migrate deploy", {
    cwd: dbDir,
    env: childEnv,
    stdio: "inherit",
  });
  execSync("node dist/seed.js", { cwd: dbDir, env: childEnv, stdio: "inherit" });
}
