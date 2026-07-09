import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@pulse/db";
import { ALL_PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { createFakeClock } from "@/lib/platform/fakes";
import {
  cancelMembership,
  createMembership,
  freezeMembership,
  getMembership,
  renewMembership,
  resumeMembership,
  upgradeMembership,
} from "@/modules/memberships/service";
import { addDays, fromDbDate, inclusiveEndDate } from "@/modules/memberships/dates";

/**
 * Integration P0 tests for Membership Lifecycle (Sprint-1 Epic-4) against the isolated test DB.
 * Proves the mandatory invariants with a real DB + injected fake clock (time is advanced to
 * exercise expiry/activation deterministically): tenant isolation (INV-1/2 → cross-gym 404),
 * permission gating per action (INV-5, allow AND deny), plan-snapshot immutability (INV-14),
 * INV-12 (≤1 active/≤1 scheduled), deferred-upgrade scheduling + auto-activation (INV-16,
 * advisor #1), renewal start-date math (REN-1), freeze end-date extension + early-resume
 * frozen-days (FRZ-2/INV-18), and cancel terminality (INV-17). Each test uses its own member so
 * the write-path INV-12 checks start clean. The shared test DB is not reset — assertions read
 * dynamic state (gym currency, computed dates), never hardcoded seed values.
 */
let owner: AuthenticatedPrincipal;
let noPerms: AuthenticatedPrincipal;
let ownerGymId: string;
let ownerBranchId: string;
let ownerCurrency: string;
let systemActorId: string;
let otherGymId: string;
let otherBranchId: string;
let otherMemberId: string;
let otherPlanId: string;

let seq = 0;
const clockAt = (iso: string): IClock => createFakeClock(new Date(`${iso}T12:00:00.000Z`));

async function makeMember(gymId: string, branchId: string): Promise<string> {
  const member = await prisma.member.create({
    data: {
      gymId,
      branchId,
      fullName: `Member ${seq++}`,
      phone: `+1555${Date.now()}${seq++}`,
    },
    select: { id: true },
  });
  return member.id;
}

async function makePlan(
  gymId: string,
  currency: string,
  over: {
    price?: bigint;
    durationValue?: number;
    durationUnit?: "DAY" | "WEEK" | "MONTH";
    isActive?: boolean;
  } = {},
): Promise<string> {
  const plan = await prisma.plan.create({
    data: {
      gymId,
      name: `Plan ${Date.now()}-${seq++}`,
      price: over.price ?? 5000n,
      currency,
      durationValue: over.durationValue ?? 1,
      durationUnit: over.durationUnit ?? "MONTH",
      isActive: over.isActive ?? true,
    },
    select: { id: true },
  });
  return plan.id;
}

beforeAll(async () => {
  const ownerUser = await prisma.user.findUniqueOrThrow({ where: { email: "owner@pulse.local" } });
  const gymUser = await prisma.gymUser.findFirstOrThrow({ where: { userId: ownerUser.id } });
  const branch = await prisma.branch.findFirstOrThrow({ where: { gymId: gymUser.gymId } });
  const systemActor = await prisma.user.findUniqueOrThrow({
    where: { email: "system-actor@pulse.internal" },
  });
  systemActorId = systemActor.id;
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
  otherPlanId = await makePlan(otherGymId, "USD");
});

// A foreign (other-gym) ACTIVE membership for the isolation tests.
async function makeForeignMembership(): Promise<string> {
  const start = "2026-03-01";
  const end = inclusiveEndDate(start, 1, "MONTH");
  const m = await prisma.membership.create({
    data: {
      gymId: otherGymId,
      branchId: otherBranchId,
      memberId: otherMemberId,
      sourcePlanId: otherPlanId,
      snapshotPlanName: "Rival Plan",
      snapshotPrice: 5000n,
      snapshotCurrency: "USD",
      snapshotDurationValue: 1,
      snapshotDurationUnit: "MONTH",
      origin: "NEW",
      startDate: new Date(`${start}T00:00:00.000Z`),
      originalEndDate: new Date(`${end}T00:00:00.000Z`),
      createdById: systemActorId,
      cachedStatus: "ACTIVE",
      cachedEffectiveEndDate: new Date(`${end}T00:00:00.000Z`),
    },
    select: { id: true },
  });
  return m.id;
}

describe("create — pipeline, permission, snapshot, money", () => {
  it("creates an Active membership and snapshots the plan terms (INV-14)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(ownerGymId, ownerCurrency, { price: 2999n });
    const result = await createMembership(
      owner,
      { memberId, planId, startDate: "2026-03-01" },
      clockAt("2026-03-01"),
    );
    expect(result.status).toBe("success");
    const m = await prisma.membership.findUniqueOrThrow({ where: { id: result.membershipId } });
    expect(m.snapshotPrice).toBe(2999n);
    expect(m.snapshotCurrency).toBe(ownerCurrency);
    expect(m.origin).toBe("NEW");
    expect(fromDbDate(m.originalEndDate)).toBe("2026-03-31"); // inclusive end (T-3)
    expect(m.cachedStatus).toBe("ACTIVE");
    expect(m.createdById).toBe(owner.userId);
  });

  it("keeps the snapshot immutable when the source plan later changes (INV-14/M-8)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(ownerGymId, ownerCurrency, { price: 4000n });
    const result = await createMembership(owner, { memberId, planId }, clockAt("2026-03-01"));
    await prisma.plan.update({ where: { id: planId }, data: { price: 9999n, name: "Renamed" } });
    const m = await prisma.membership.findUniqueOrThrow({ where: { id: result.membershipId } });
    expect(m.snapshotPrice).toBe(4000n); // unchanged by the live-plan edit
  });

  it("denies create without memberships.create (by permission, not role)", async () => {
    await expect(
      createMembership(noPerms, { memberId: otherMemberId, planId: otherPlanId }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("refuses to sell a retired (inactive) plan (PLN-2)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(ownerGymId, ownerCurrency, { isActive: false });
    const result = await createMembership(owner, { memberId, planId }, clockAt("2026-03-01"));
    expect(result.status).toBe("error");
  });

  it("blocks a second active membership for the same member (INV-12)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(ownerGymId, ownerCurrency);
    expect(
      (await createMembership(owner, { memberId, planId }, clockAt("2026-03-01"))).status,
    ).toBe("success");
    const second = await createMembership(owner, { memberId, planId }, clockAt("2026-03-01"));
    expect(second.status).toBe("error");
  });
});

describe("tenant isolation (INV-1/2 → 404, never 403)", () => {
  it("surfaces a cross-gym membership as 404 on read and on every mutation", async () => {
    const foreign = await makeForeignMembership();
    await expect(getMembership(owner, foreign)).rejects.toBeInstanceOf(NotFoundError);
    await expect(renewMembership(owner, foreign)).rejects.toBeInstanceOf(NotFoundError);
    await expect(upgradeMembership(owner, foreign, { planId: otherPlanId })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(freezeMembership(owner, foreign, { frozenDays: 5 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(cancelMembership(owner, foreign)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("deferred upgrade (UPG-1/INV-16) + auto-activation (advisor #1)", () => {
  it("schedules the new plan for the day after the current end, current untouched", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planA = await makePlan(ownerGymId, ownerCurrency, { price: 3000n });
    const planB = await makePlan(ownerGymId, ownerCurrency, { price: 6000n });
    const m1 = await createMembership(owner, { memberId, planId: planA }, clockAt("2026-03-01"));
    const m2res = await upgradeMembership(
      owner,
      m1.membershipId ?? "",
      { planId: planB },
      clockAt("2026-03-01"),
    );
    expect(m2res.status).toBe("success");

    const m2 = await prisma.membership.findUniqueOrThrow({ where: { id: m2res.membershipId } });
    expect(m2.origin).toBe("UPGRADE"); // planB dearer than planA
    expect(m2.predecessorMembershipId).toBe(m1.membershipId);
    const effFrom = m2.scheduledEffectiveFrom;
    if (!effFrom) throw new Error("expected a scheduledEffectiveFrom");
    expect(fromDbDate(effFrom)).toBe("2026-04-01"); // day after 2026-03-31
    expect(m2.cachedStatus).toBe("SCHEDULED");

    // current period is unchanged (no proration/refund — UPG-3).
    const m1row = await prisma.membership.findUniqueOrThrow({ where: { id: m1.membershipId } });
    expect(m1row.cancelledAt).toBeNull();
    expect(fromDbDate(m1row.originalEndDate)).toBe("2026-03-31");
  });

  it("auto-activates the scheduled period once the predecessor expires (derived on read)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planA = await makePlan(ownerGymId, ownerCurrency, { price: 3000n });
    const planB = await makePlan(ownerGymId, ownerCurrency, { price: 6000n });
    const m1 = await createMembership(owner, { memberId, planId: planA }, clockAt("2026-03-01"));
    const m2 = await upgradeMembership(
      owner,
      m1.membershipId ?? "",
      { planId: planB },
      clockAt("2026-03-01"),
    );

    // Before the boundary: scheduled.
    expect((await getMembership(owner, m2.membershipId ?? "", clockAt("2026-03-15"))).status).toBe(
      "SCHEDULED",
    );
    // After the predecessor's end: the successor is ACTIVE, the predecessor EXPIRED.
    expect((await getMembership(owner, m2.membershipId ?? "", clockAt("2026-04-05"))).status).toBe(
      "ACTIVE",
    );
    expect((await getMembership(owner, m1.membershipId ?? "", clockAt("2026-04-05"))).status).toBe(
      "EXPIRED",
    );
  });

  it("blocks a second scheduled period (MSH-7/INV-12)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planA = await makePlan(ownerGymId, ownerCurrency);
    const planB = await makePlan(ownerGymId, ownerCurrency, { price: 6000n });
    const m1 = await createMembership(owner, { memberId, planId: planA }, clockAt("2026-03-01"));
    expect(
      (
        await upgradeMembership(
          owner,
          m1.membershipId ?? "",
          { planId: planB },
          clockAt("2026-03-01"),
        )
      ).status,
    ).toBe("success");
    const second = await upgradeMembership(
      owner,
      m1.membershipId ?? "",
      { planId: planB },
      clockAt("2026-03-01"),
    );
    expect(second.status).toBe("error");
  });

  it("denies upgrade without memberships.upgrade", async () => {
    await expect(upgradeMembership(noPerms, "any", { planId: otherPlanId })).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
});

describe("renewal start-date math (REN-1)", () => {
  it("early renewal queues the next period from the day after the current end", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(ownerGymId, ownerCurrency);
    const m1 = await createMembership(owner, { memberId, planId }, clockAt("2026-03-01"));
    const m2res = await renewMembership(owner, m1.membershipId ?? "", clockAt("2026-03-10"));
    expect(m2res.status).toBe("success");
    const m2 = await prisma.membership.findUniqueOrThrow({ where: { id: m2res.membershipId } });
    expect(m2.origin).toBe("RENEWAL");
    expect(m2.cachedStatus).toBe("SCHEDULED");
    const effFrom = m2.scheduledEffectiveFrom;
    if (!effFrom) throw new Error("expected a scheduledEffectiveFrom");
    expect(fromDbDate(effFrom)).toBe("2026-04-01"); // day after 2026-03-31
  });

  it("renewal after expiry starts a new period today (immediately Active)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(ownerGymId, ownerCurrency);
    const m1 = await createMembership(owner, { memberId, planId }, clockAt("2026-03-01"));
    const m2res = await renewMembership(owner, m1.membershipId ?? "", clockAt("2026-05-01"));
    const m2 = await prisma.membership.findUniqueOrThrow({ where: { id: m2res.membershipId } });
    expect(m2.scheduledEffectiveFrom).toBeNull();
    expect(fromDbDate(m2.startDate)).toBe("2026-05-01");
    expect(m2.cachedStatus).toBe("ACTIVE");
  });

  it("denies renew without memberships.renew", async () => {
    await expect(renewMembership(noPerms, "any")).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("freeze + resume (FRZ-2/INV-18)", () => {
  it("extends the end date by exactly the actual frozen days on early resume", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(ownerGymId, ownerCurrency);
    const m1 = await createMembership(owner, { memberId, planId }, clockAt("2026-03-01"));
    const id = m1.membershipId ?? "";

    expect(
      (await freezeMembership(owner, id, { frozenDays: 10 }, clockAt("2026-03-05"))).status,
    ).toBe("success");
    expect((await getMembership(owner, id, clockAt("2026-03-06"))).status).toBe("FROZEN");

    // Resume 3 days after the freeze started → exactly 3 frozen days applied.
    expect((await resumeMembership(owner, id, clockAt("2026-03-08"))).status).toBe("success");
    const m = await prisma.membership.findUniqueOrThrow({ where: { id } });
    expect(m.cachedTotalFrozenDays).toBe(3);
    expect(fromDbDate(m.cachedEffectiveEndDate)).toBe(addDays("2026-03-31", 3)); // 2026-04-03
    expect(m.cachedStatus).toBe("ACTIVE");

    const freeze = await prisma.membershipFreeze.findFirstOrThrow({ where: { membershipId: id } });
    expect(freeze.status).toBe("ENDED");
    expect(freeze.frozenDays).toBe(3);
    const actualEnd = freeze.actualEnd;
    if (!actualEnd) throw new Error("expected an actualEnd");
    expect(fromDbDate(actualEnd)).toBe("2026-03-08");
  });

  it("refuses to freeze a non-active membership (FRZ-4)", async () => {
    // Prove the status guard on an expired own membership (cross-gym is covered by the 404 tests).
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(ownerGymId, ownerCurrency);
    const m1 = await createMembership(owner, { memberId, planId }, clockAt("2026-03-01"));
    const result = await freezeMembership(
      owner,
      m1.membershipId ?? "",
      { frozenDays: 5 },
      clockAt("2026-06-01"),
    );
    expect(result.status).toBe("error"); // expired by 2026-06-01
  });

  it("denies freeze/resume without memberships.freeze", async () => {
    await expect(freezeMembership(noPerms, "any", { frozenDays: 5 })).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    await expect(resumeMembership(noPerms, "any")).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("cancel terminality (INV-17)", () => {
  it("cancels an active membership and refuses to renew or re-cancel it", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(ownerGymId, ownerCurrency);
    const m1 = await createMembership(owner, { memberId, planId }, clockAt("2026-03-01"));
    const id = m1.membershipId ?? "";

    expect((await cancelMembership(owner, id, clockAt("2026-03-10"))).status).toBe("success");
    const m = await prisma.membership.findUniqueOrThrow({ where: { id } });
    expect(m.cachedStatus).toBe("CANCELLED");
    expect(m.cancelledAt).not.toBeNull();
    expect(m.cancelledById).toBe(owner.userId);

    expect((await renewMembership(owner, id, clockAt("2026-03-11"))).status).toBe("error"); // REN-4
    expect((await cancelMembership(owner, id, clockAt("2026-03-11"))).status).toBe("error"); // already cancelled
  });

  it("denies cancel without memberships.cancel", async () => {
    await expect(cancelMembership(noPerms, "any")).rejects.toBeInstanceOf(AuthorizationError);
  });
});
