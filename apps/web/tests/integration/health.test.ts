import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@pulse/db";
import { GET } from "@/app/api/health/route";

// Business/transactional tables reset between tests for isolation; the IAM +
// tenant reference data (seeded) is left intact.
const BUSINESS_TABLES = [
  "audit_logs",
  "notifications",
  "payments",
  "membership_freezes",
  "memberships",
  "trainer_assignments",
  "member_notes",
  "members",
];

async function resetBusinessData(): Promise<void> {
  const list = BUSINESS_TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

beforeEach(async () => {
  await resetBusinessData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

interface HealthBody {
  status: string;
  checks: { database: string };
}

describe("integration: health endpoint + test-DB isolation (T-23)", () => {
  it("reports readiness ok when the test database is reachable", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as HealthBody;
    expect(body.status).toBe("ok");
    expect(body.checks.database).toBe("ok");
  });

  it("ran migrate + seed against the isolated test database", async () => {
    expect(await prisma.permission.count()).toBe(40);
    expect(await prisma.capability.count()).toBe(13);
    expect(await prisma.role.count()).toBe(5);
  });

  it("resets business tables between tests (isolation mechanism works)", async () => {
    expect(await prisma.member.count()).toBe(0);
  });
});
