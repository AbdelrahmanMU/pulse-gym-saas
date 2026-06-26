import { resolve } from "node:path";

// Per-worker setup: point the Prisma client at the isolated test database BEFORE
// any module imports `@pulse/db` (whose singleton reads DATABASE_URL on import).
const repoRoot = resolve(import.meta.dirname, "../../../..");
process.loadEnvFile(resolve(repoRoot, ".env"));

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  throw new Error("DATABASE_URL_TEST is not set — cannot run integration tests.");
}
process.env.DATABASE_URL = testUrl;
