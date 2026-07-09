import { NextResponse } from "next/server";
import { prisma } from "@pulse/db";
import { log } from "@/lib/logger";

// Public, unauthenticated liveness + DB-readiness probe (T-18). Always dynamic and
// on the Node runtime so the readiness query runs per request (never at build).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/health — liveness (the process responds) + readiness (a cheap DB
 * connectivity probe). The payload is intentionally minimal: no secrets, no env
 * values, no stack traces (security-guidelines §API; logging-observability §Monitoring).
 * Returns 200 when the database is reachable, 503 when readiness is degraded.
 */
export async function GET(): Promise<NextResponse> {
  let databaseOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
  } catch (err) {
    log.error("health: database readiness probe failed", {
      module: "health",
      code: "DB_UNREACHABLE",
      err,
    });
  }

  const body = {
    status: databaseOk ? "ok" : "degraded",
    checks: { database: databaseOk ? "ok" : "down" },
  };
  return NextResponse.json(body, { status: databaseOk ? 200 : 503 });
}
