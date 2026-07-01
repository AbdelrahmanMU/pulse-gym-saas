import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@pulse/db";
import { ALL_PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { createFakeClock } from "@/lib/platform/fakes";
import { archiveMember } from "@/modules/members/service";
import { evaluateMemberArchive } from "@/modules/members/policy";
import {
  cancelMembership,
  createMembership,
  upgradeMembership,
} from "@/modules/memberships/service";
import { recordPayment } from "@/modules/payments/service";

/**
 * Integration P0 tests for **Reliability Slice 1 — Member Archive Guard** (ARC-3 / INV-11)
 * against the isolated test DB. Proves the invariant that a member may be archived **only if**
 * they have no Active membership, no Scheduled membership, and no Outstanding Balance — enforced
 * by the Member policy layer composing the memberships + payments public reads. Time is supplied
 * by an injected fake clock so derived membership status is deterministic. Each test uses its own
 * member so the guard evaluates a clean membership set (the shared test DB is not reset).
 */
let owner: AuthenticatedPrincipal;
let noPerms: AuthenticatedPrincipal;
let ownerGymId: string;
let ownerBranchId: string;
let ownerCurrency: string; // 2-decimal (USD/EUR) as elsewhere in the suite
let otherGymId: string;
let otherBranchId: string;
let otherMemberId: string;

let seq = 0;
const clockAt = (iso: string): IClock => createFakeClock(new Date(`${iso}T12:00:00.000Z`));

async function makeMember(gymId: string, branchId: string): Promise<string> {
  const member = await prisma.member.create({
    data: { gymId, branchId, fullName: `Member ${seq++}`, phone: `+1555${Date.now()}${seq++}` },
    select: { id: true },
  });
  return member.id;
}

async function makePlan(price: bigint): Promise<string> {
  const plan = await prisma.plan.create({
    data: {
      gymId: ownerGymId,
      name: `Plan ${Date.now()}-${seq++}`,
      price,
      currency: ownerCurrency,
      durationValue: 1,
      durationUnit: "MONTH",
      isActive: true,
    },
    select: { id: true },
  });
  return plan.id;
}

beforeAll(async () => {
  const ownerUser = await prisma.user.findUniqueOrThrow({ where: { email: "owner@pulse.local" } });
  const gymUser = await prisma.gymUser.findFirstOrThrow({ where: { userId: ownerUser.id } });
  const branch = await prisma.branch.findFirstOrThrow({ where: { gymId: gymUser.gymId } });
  ownerGymId = gymUser.gymId;
  ownerBranchId = branch.id;
  ownerCurrency = (
    await prisma.gym.findUniqueOrThrow({
      where: { id: ownerGymId },
      select: { defaultCurrency: true },
    })
  ).defaultCurrency;
  owner = {
    userId: ownerUser.id,
    email: ownerUser.email,
    displayName: ownerUser.displayName,
    gymId: ownerGymId,
    branchId: branch.id,
    gymUserId: gymUser.id,
    permissions: [...ALL_PERMISSION_KEYS],
  };
  noPerms = { ...owner, permissions: [] };

  const otherGym = await prisma.gym.create({
    data: { name: "Rival Gym", defaultCurrency: "USD", timeZone: "UTC" },
  });
  otherGymId = otherGym.id;
  otherBranchId = (
    await prisma.branch.create({ data: { gymId: otherGymId, name: "Rival Branch" } })
  ).id;
  otherMemberId = await makeMember(otherGymId, otherBranchId);
});

describe("archive allowed — no active/scheduled membership and no balance", () => {
  it("archives a member with no memberships at all", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const result = await archiveMember(owner, memberId, clockAt("2026-06-01"));
    expect(result.status).toBe("success");
    const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    expect(member.status).toBe("ARCHIVED");
    expect(member.archivedAt).not.toBeNull();
  });

  it("archives a member whose only membership is expired and fully paid (guard runs, permits)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(5000n);
    const created = await createMembership(
      owner,
      { memberId, planId, startDate: "2026-03-01" },
      clockAt("2026-03-01"),
    );
    // Pay the balance in full (5000 minor = "50.00" in a 2-decimal currency).
    const paid = await recordPayment(
      owner,
      created.membershipId ?? "",
      { amount: "50.00", method: "CASH", receivedOn: "2026-03-05" },
      clockAt("2026-03-05"),
    );
    expect(paid.status).toBe("success");

    // At 2026-06-01 the membership is long expired (not active/scheduled) and its balance is 0.
    const result = await archiveMember(owner, memberId, clockAt("2026-06-01"));
    expect(result.status).toBe("success");
    expect((await prisma.member.findUniqueOrThrow({ where: { id: memberId } })).status).toBe(
      "ARCHIVED",
    );
  });
});

describe("archive denied — active membership (ARC-3)", () => {
  it("rejects archive while a membership is Active, leaving the member ACTIVE", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(5000n);
    await createMembership(
      owner,
      { memberId, planId, startDate: "2026-03-01" },
      clockAt("2026-03-01"),
    );

    // Judged mid-period → derived ACTIVE.
    const result = await archiveMember(owner, memberId, clockAt("2026-03-15"));
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.message).toMatch(/active membership/i);
    expect((await prisma.member.findUniqueOrThrow({ where: { id: memberId } })).status).toBe(
      "ACTIVE",
    );
  });
});

describe("archive denied — scheduled membership (ARC-3)", () => {
  it("rejects archive while a Scheduled (deferred-upgrade) membership is pending", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planA = await makePlan(3000n);
    const planB = await makePlan(6000n);
    const m1 = await createMembership(
      owner,
      { memberId, planId: planA, startDate: "2026-03-01" },
      clockAt("2026-03-01"),
    );
    // Deferred upgrade schedules planB from the day after m1's end (2026-04-01).
    await upgradeMembership(owner, m1.membershipId ?? "", { planId: planB }, clockAt("2026-03-01"));
    // Cancel the current active period so only the SCHEDULED successor remains (still before its start).
    await cancelMembership(owner, m1.membershipId ?? "", clockAt("2026-03-15"));

    const result = await archiveMember(owner, memberId, clockAt("2026-03-15"));
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.message).toMatch(/scheduled membership/i);

    // Prove the isolation: only SCHEDULED blocks (no active, no balance) at this instant.
    const eligibility = await evaluateMemberArchive(owner, memberId, clockAt("2026-03-15"));
    expect(eligibility.blocks).toEqual(["SCHEDULED_MEMBERSHIP"]);
  });
});

describe("archive denied — outstanding balance (ARC-3 / INV-24)", () => {
  it("rejects archive while an expired membership still carries a balance", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(5000n);
    const created = await createMembership(
      owner,
      { memberId, planId, startDate: "2026-03-01" },
      clockAt("2026-03-01"),
    );
    // Partial payment: 20.00 of 50.00 → 30.00 remains outstanding.
    await recordPayment(
      owner,
      created.membershipId ?? "",
      { amount: "20.00", method: "CASH", receivedOn: "2026-03-05" },
      clockAt("2026-03-05"),
    );

    // At 2026-06-01 the membership is expired (not active/scheduled) but the balance remains.
    const result = await archiveMember(owner, memberId, clockAt("2026-06-01"));
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.message).toMatch(/outstanding balance/i);
    expect((await prisma.member.findUniqueOrThrow({ where: { id: memberId } })).status).toBe(
      "ACTIVE",
    );

    const eligibility = await evaluateMemberArchive(owner, memberId, clockAt("2026-06-01"));
    expect(eligibility.blocks).toEqual(["OUTSTANDING_BALANCE"]);
  });
});

describe("tenant isolation & permission (INV-1/2, INV-5)", () => {
  it("surfaces a cross-gym member as 404 before the guard runs (never 403)", async () => {
    await expect(archiveMember(owner, otherMemberId, clockAt("2026-06-01"))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("denies archive without members.archive (by permission, not role)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    await expect(archiveMember(noPerms, memberId, clockAt("2026-06-01"))).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
});
