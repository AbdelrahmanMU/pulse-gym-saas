import { beforeAll, describe, expect, it } from "vitest";
import {
  prisma,
  FreezeStatus,
  MembershipOrigin,
  MembershipStatus,
  PaymentStanding,
} from "@pulse/db";
import { ALL_PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { createFakeClock } from "@/lib/platform/fakes";
import {
  cancelMembership,
  createMembership,
  freezeMembership,
  getMemberMembershipTimeline,
  renewMembership,
  resumeMembership,
  upgradeMembership,
} from "@/modules/memberships/service";
import { buildRailSegments } from "@/modules/memberships/rail-model";
import { getMemberPaymentSummaries, recordPayment } from "@/modules/payments/service";

/**
 * P0 integration tests for the **A-1 member timeline read** + the per-membership payment
 * summaries (member workspace W2) against the isolated test DB. The dangerous surface is the
 * new `memberId` params (tenant isolation — R4); the rest proves the read model faithfully
 * surfaces what the lifecycle engine derived: ordering, renewal chains, origin labels, freeze
 * nesting/finalization, cancellation, and long histories. Time is injected via fake clocks.
 */
let owner: AuthenticatedPrincipal;
let noPerms: AuthenticatedPrincipal;
let ownerGymId: string;
let ownerBranchId: string;
let ownerCurrency: string;
let otherGymId: string;
let otherMemberId: string;

let seq = 0;
const clockAt = (iso: string): IClock => createFakeClock(new Date(`${iso}T12:00:00.000Z`));

async function makeMember(gymId: string, branchId: string): Promise<string> {
  const member = await prisma.member.create({
    data: { gymId, branchId, fullName: `Rail ${seq++}`, phone: `+20100${Date.now()}${seq++}` },
    select: { id: true },
  });
  return member.id;
}

async function makePlan(price: bigint, name?: string): Promise<string> {
  const plan = await prisma.plan.create({
    data: {
      gymId: ownerGymId,
      name: name ?? `Rail Plan ${Date.now()}-${seq++}`,
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

async function sell(memberId: string, planId: string, startDate: string): Promise<string> {
  const result = await createMembership(owner, { memberId, planId, startDate }, clockAt(startDate));
  expect(result.status).toBe("success");
  return result.membershipId ?? "";
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
    data: { name: "Rival Rail Gym", defaultCurrency: "USD", timeZone: "UTC" },
  });
  otherGymId = otherGym.id;
  const otherBranch = await prisma.branch.create({
    data: { gymId: otherGymId, name: "Rival Branch" },
  });
  otherMemberId = await makeMember(otherGymId, otherBranch.id);
});

describe("tenant isolation & permission (P0 — R4)", () => {
  it("surfaces a cross-gym member as 404 on the timeline read (never 403, never data)", async () => {
    await expect(
      getMemberMembershipTimeline(owner, otherMemberId, clockAt("2026-06-01")),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("surfaces an unknown member as 404 on the timeline read", async () => {
    await expect(
      getMemberMembershipTimeline(
        owner,
        "00000000-0000-7000-8000-000000000000",
        clockAt("2026-06-01"),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("yields an empty list for a cross-gym member on the payment summaries read", async () => {
    await expect(getMemberPaymentSummaries(owner, otherMemberId)).resolves.toEqual([]);
  });

  it("denies both reads without their permission (by permission, not role)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    await expect(
      getMemberMembershipTimeline(noPerms, memberId, clockAt("2026-06-01")),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(getMemberPaymentSummaries(noPerms, memberId)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
});

describe("timeline shape & ordering", () => {
  it("returns an empty story (with today) for a member with no memberships", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const timeline = await getMemberMembershipTimeline(owner, memberId, clockAt("2026-06-01"));
    expect(timeline.memberships).toEqual([]);
    expect(timeline.today).toBe("2026-06-01");
    expect(timeline.memberId).toBe(memberId);
  });

  it("orders a renewal chain newest first with intact predecessor links (scenarios B/D)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(5000n);
    const m1 = await sell(memberId, planId, "2026-03-01"); // ends 2026-03-31 (inclusive)
    const renewed = await renewMembership(owner, m1, clockAt("2026-03-20"));
    expect(renewed.status).toBe("success");

    const timeline = await getMemberMembershipTimeline(owner, memberId, clockAt("2026-03-25"));
    expect(timeline.memberships).toHaveLength(2);
    const [next, current] = timeline.memberships;
    expect(next).toMatchObject({
      status: MembershipStatus.SCHEDULED,
      origin: MembershipOrigin.RENEWAL,
      predecessorMembershipId: m1,
      startDate: "2026-04-01",
      scheduledEffectiveFrom: "2026-04-01",
    });
    expect(current).toMatchObject({
      id: m1,
      status: MembershipStatus.ACTIVE,
      effectiveEndDate: "2026-03-31",
    });
    expect(next?.soldByName).toBe(owner.displayName);

    // Composition check: the rail grammar reads this as [next card, renewal connector, current].
    const kinds = buildRailSegments(timeline.memberships, timeline.today).map((s) => s.kind);
    expect(kinds).toEqual(["card", "connector", "card"]);
  });

  it("carries upgrade origin + both plan names for the connector label (scenario E)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const silver = await makePlan(3000n, `Silver Rail ${seq++}`);
    const gold = await makePlan(6000n, `Gold Rail ${seq++}`);
    const m1 = await sell(memberId, silver, "2026-03-01");
    const upgraded = await upgradeMembership(owner, m1, { planId: gold }, clockAt("2026-03-10"));
    expect(upgraded.status).toBe("success");

    const timeline = await getMemberMembershipTimeline(owner, memberId, clockAt("2026-03-12"));
    const [next, current] = timeline.memberships;
    expect(next).toMatchObject({
      origin: MembershipOrigin.UPGRADE,
      predecessorMembershipId: m1,
      status: MembershipStatus.SCHEDULED,
    });
    expect(next?.planName).not.toBe(current?.planName);
  });
});

describe("freeze nesting (scenario C)", () => {
  it("nests an open freeze with the display-only projection, then the finalized episode on resume", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(5000n);
    const m1 = await sell(memberId, planId, "2026-03-01"); // ends 2026-03-31
    const frozen = await freezeMembership(owner, m1, { frozenDays: 10 }, clockAt("2026-03-10"));
    expect(frozen.status).toBe("success");

    const whileFrozen = await getMemberMembershipTimeline(owner, memberId, clockAt("2026-03-12"));
    const frozenEntry = whileFrozen.memberships[0];
    expect(frozenEntry).toMatchObject({ id: m1, status: MembershipStatus.FROZEN });
    expect(frozenEntry?.freezes).toHaveLength(1);
    expect(frozenEntry?.freezes[0]).toMatchObject({
      freezeStart: "2026-03-10",
      actualEnd: null,
      status: FreezeStatus.ACTIVE,
    });
    // Projection is display-only and labeled an estimate in the UI; the end date is NOT moved.
    expect(frozenEntry?.effectiveEndDate).toBe("2026-03-31");
    expect(frozenEntry?.activeFreeze).toMatchObject({ plannedDays: 10 });

    const resumed = await resumeMembership(owner, m1, clockAt("2026-03-15"));
    expect(resumed.status).toBe("success");

    const after = await getMemberMembershipTimeline(owner, memberId, clockAt("2026-03-16"));
    const entry = after.memberships[0];
    // The extension finalizes to the ACTUAL paused days (5), never the planned 10 (INV-18).
    expect(entry).toMatchObject({
      status: MembershipStatus.ACTIVE,
      effectiveEndDate: "2026-04-05",
      totalFrozenDays: 5,
      activeFreeze: null,
    });
    expect(entry?.freezes[0]).toMatchObject({
      freezeStart: "2026-03-10",
      actualEnd: "2026-03-15",
      frozenDays: 5,
      status: FreezeStatus.ENDED,
    });
  });
});

describe("cancellation (scenario F)", () => {
  it("surfaces the cancellation day + actor and derives CANCELLED", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(5000n);
    const m1 = await sell(memberId, planId, "2026-03-01");
    const cancelled = await cancelMembership(owner, m1, clockAt("2026-03-15"));
    expect(cancelled.status).toBe("success");

    const timeline = await getMemberMembershipTimeline(owner, memberId, clockAt("2026-03-20"));
    expect(timeline.memberships[0]).toMatchObject({
      id: m1,
      status: MembershipStatus.CANCELLED,
      cancelledOn: "2026-03-15",
      cancelledByName: owner.displayName,
    });
  });
});

describe("coverage gaps & long history (scenarios G/H)", () => {
  it("supports explicit gap rendering between disjoint memberships", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(5000n);
    await sell(memberId, planId, "2026-01-01"); // ends 2026-01-31
    await sell(memberId, planId, "2026-03-01"); // 28 uncovered days between

    const timeline = await getMemberMembershipTimeline(owner, memberId, clockAt("2026-03-10"));
    const segments = buildRailSegments(timeline.memberships, timeline.today);
    expect(segments.map((s) => s.kind)).toEqual(["card", "gap", "card"]);
    expect(segments[1]).toMatchObject({ kind: "gap", days: 28 });
  });

  it("returns a full 8-membership renewal chain, ordered, chain intact (scenario H)", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(5000n);
    const ids: string[] = [await sell(memberId, planId, "2025-01-01")];
    // Renew the live tail mid-month, seven times: contiguous chain Feb..Aug.
    const renewDays = [
      "2025-01-20",
      "2025-02-20",
      "2025-03-20",
      "2025-04-20",
      "2025-05-20",
      "2025-06-20",
      "2025-07-20",
    ];
    for (const day of renewDays) {
      const result = await renewMembership(owner, ids[ids.length - 1] ?? "", clockAt(day));
      expect(result.status).toBe("success");
      ids.push(result.membershipId ?? "");
    }

    const timeline = await getMemberMembershipTimeline(owner, memberId, clockAt("2025-08-15"));
    expect(timeline.memberships).toHaveLength(8);
    // Newest first; every link of the chain preserved; exactly one current.
    expect(timeline.memberships.map((m) => m.id)).toEqual([...ids].reverse());
    timeline.memberships.slice(0, -1).forEach((m, i) => {
      expect(m.predecessorMembershipId).toBe(timeline.memberships[i + 1]?.id);
      expect(m.origin).toBe(MembershipOrigin.RENEWAL);
    });
    expect(timeline.memberships[0]?.status).toBe(MembershipStatus.ACTIVE);
    expect(timeline.memberships.slice(1).every((m) => m.status === MembershipStatus.EXPIRED)).toBe(
      true,
    );

    const segments = buildRailSegments(timeline.memberships, timeline.today);
    expect(segments.filter((s) => s.kind === "card")).toHaveLength(8);
    expect(segments.filter((s) => s.kind === "connector")).toHaveLength(7);
  });
});

describe("per-membership payment summaries (W2 money facts)", () => {
  it("states each membership's own ledger truth — including cancelled and scheduled", async () => {
    const memberId = await makeMember(ownerGymId, ownerBranchId);
    const planId = await makePlan(5000n);
    // Chronological story: an early membership cancelled unpaid, then a partially-paid one
    // with an unpaid scheduled renewal queued behind it.
    const m3 = await sell(memberId, planId, "2026-01-01");
    await cancelMembership(owner, m3, clockAt("2026-01-10")); // cancelled, unpaid
    const m1 = await sell(memberId, planId, "2026-03-01");
    await recordPayment(
      owner,
      m1,
      { amount: "20.00", method: "CASH", receivedOn: "2026-03-02" },
      clockAt("2026-03-02"),
    );
    const renewed = await renewMembership(owner, m1, clockAt("2026-03-20")); // scheduled, unpaid

    const summaries = await getMemberPaymentSummaries(owner, memberId);
    const byId = new Map(summaries.map((s) => [s.membershipId, s]));
    expect(summaries).toHaveLength(3);
    expect(byId.get(m1)).toMatchObject({
      remainingMinor: "3000",
      standing: PaymentStanding.PARTIALLY_PAID,
      currency: ownerCurrency,
    });
    // The scheduled renewal and the cancelled membership both state their own money truth —
    // deliberately NOT the aggregate "outstanding" definition (write-offs/exclusions live there).
    expect(byId.get(renewed.membershipId ?? "")).toMatchObject({
      remainingMinor: "5000",
      standing: PaymentStanding.PENDING,
    });
    expect(byId.get(m3)).toMatchObject({
      remainingMinor: "5000",
      standing: PaymentStanding.PENDING,
    });
  });
});
