import { describe, expect, it } from "vitest";
import { MembershipOrigin, MembershipStatus } from "@pulse/db";
import { buildRailSegments, railSlot, type RailSegment } from "./rail-model";
import type { MemberTimelineMembership } from "./service";

/**
 * Rail composition grammar (W2) — pure adjacency over the A-1 order (newest first):
 * slots, origin-labeled connectors, explicit gaps, the lapsed head, and the severed
 * rail under cancellations. No lifecycle rules are re-tested here (lifecycle.test.ts
 * owns derivation); these fixtures arrive pre-derived exactly as A-1 emits them.
 */
let seq = 0;

function membership(over: Partial<MemberTimelineMembership>): MemberTimelineMembership {
  seq += 1;
  return {
    id: `m-${seq}`,
    planName: "Gold Monthly",
    status: MembershipStatus.ACTIVE,
    origin: MembershipOrigin.NEW,
    predecessorMembershipId: null,
    startDate: "2026-06-01",
    effectiveEndDate: "2026-06-30",
    remainingDays: 10,
    isExpiringSoon: false,
    priceMinor: "120000",
    currency: "EGP",
    durationValue: 1,
    durationUnit: "MONTH",
    scheduledEffectiveFrom: null,
    soldOn: "2026-06-01",
    soldByName: "Pat Owner",
    cancelledOn: null,
    cancelledByName: null,
    totalFrozenDays: 0,
    activeFreeze: null,
    freezes: [],
    ...over,
  };
}

const kinds = (segments: RailSegment[]): string[] => segments.map((s) => s.kind);

describe("railSlot", () => {
  it("maps every derived status onto exactly one slot", () => {
    expect(railSlot(MembershipStatus.ACTIVE)).toBe("current");
    expect(railSlot(MembershipStatus.FROZEN)).toBe("current");
    expect(railSlot(MembershipStatus.SCHEDULED)).toBe("next");
    expect(railSlot(MembershipStatus.EXPIRED)).toBe("past");
    expect(railSlot(MembershipStatus.CANCELLED)).toBe("past");
  });
});

describe("buildRailSegments", () => {
  it("renders a lone current membership as a single card (scenario A)", () => {
    const segments = buildRailSegments([membership({})], "2026-06-20");
    expect(kinds(segments)).toEqual(["card"]);
    expect(segments[0]).toMatchObject({ slot: "current", severedBelow: false });
  });

  it("chains Next above Current with a renewal connector and no gap (scenario B/D)", () => {
    const current = membership({ startDate: "2026-06-01", effectiveEndDate: "2026-06-30" });
    const next = membership({
      status: MembershipStatus.SCHEDULED,
      origin: MembershipOrigin.RENEWAL,
      predecessorMembershipId: current.id,
      startDate: "2026-07-01",
      effectiveEndDate: "2026-07-31",
      scheduledEffectiveFrom: "2026-07-01",
      soldOn: "2026-06-20",
    });
    const segments = buildRailSegments([next, current], "2026-06-25");
    expect(kinds(segments)).toEqual(["card", "connector", "card"]);
    expect(segments[0]).toMatchObject({ slot: "next" });
    expect(segments[1]).toMatchObject({
      kind: "connector",
      variant: "renewed",
      soldOn: "2026-06-20",
    });
    expect(segments[2]).toMatchObject({ slot: "current" });
  });

  it("labels an upgrade connector with both plans (scenario E)", () => {
    const older = membership({
      planName: "Silver Monthly",
      status: MembershipStatus.EXPIRED,
      startDate: "2026-04-01",
      effectiveEndDate: "2026-04-30",
    });
    const newer = membership({
      planName: "Gold Monthly",
      origin: MembershipOrigin.UPGRADE,
      predecessorMembershipId: older.id,
      startDate: "2026-05-01",
      effectiveEndDate: "2026-05-31",
    });
    const segments = buildRailSegments([newer, older], "2026-05-15");
    expect(segments[1]).toMatchObject({
      kind: "connector",
      variant: "upgraded",
      fromPlan: "Silver Monthly",
      toPlan: "Gold Monthly",
    });
  });

  it("labels a downgrade as smaller-plan (never the word downgrade — §D14)", () => {
    const older = membership({
      planName: "Gold Monthly",
      status: MembershipStatus.EXPIRED,
      startDate: "2026-04-01",
      effectiveEndDate: "2026-04-30",
    });
    const newer = membership({
      planName: "Silver Monthly",
      origin: MembershipOrigin.DOWNGRADE,
      predecessorMembershipId: older.id,
      startDate: "2026-05-01",
    });
    const segments = buildRailSegments([newer, older], "2026-05-15");
    expect(segments[1]).toMatchObject({ kind: "connector", variant: "smaller-plan" });
  });

  it("marks an explicit coverage gap between unchained cards (scenario G)", () => {
    const older = membership({
      status: MembershipStatus.EXPIRED,
      startDate: "2026-03-01",
      effectiveEndDate: "2026-03-31",
    });
    const newer = membership({ startDate: "2026-04-22", effectiveEndDate: "2026-05-21" });
    const segments = buildRailSegments([newer, older], "2026-05-01");
    expect(kinds(segments)).toEqual(["card", "gap", "card"]);
    expect(segments[1]).toMatchObject({ kind: "gap", days: 21 });
  });

  it("renders no gap when coverage is contiguous (inclusive end + next-day start)", () => {
    const older = membership({
      status: MembershipStatus.EXPIRED,
      startDate: "2026-03-01",
      effectiveEndDate: "2026-03-31",
    });
    const newer = membership({ startDate: "2026-04-01" });
    const segments = buildRailSegments([newer, older], "2026-04-10");
    expect(kinds(segments)).toEqual(["card", "card"]);
  });

  it("severs the rail under a cancelled card and cuts its coverage at the cancel day (scenario F)", () => {
    const cancelled = membership({
      status: MembershipStatus.CANCELLED,
      startDate: "2026-01-15",
      effectiveEndDate: "2026-02-14",
      cancelledOn: "2026-02-08",
      cancelledByName: "Pat Owner",
    });
    const newer = membership({ startDate: "2026-03-01", effectiveEndDate: "2026-03-31" });
    const segments = buildRailSegments([newer, cancelled], "2026-03-10");
    // Gap counts from the cancellation cut (Feb 8), not the never-reached end date.
    expect(kinds(segments)).toEqual(["card", "gap", "card"]);
    expect(segments[1]).toMatchObject({ kind: "gap", days: 20 });
    expect(segments[2]).toMatchObject({ slot: "past", severedBelow: true });
  });

  it("opens with gap-to-now when the member is lapsed (D10)", () => {
    const expired = membership({
      status: MembershipStatus.EXPIRED,
      startDate: "2026-03-01",
      effectiveEndDate: "2026-03-31",
    });
    const segments = buildRailSegments([expired], "2026-04-21");
    expect(kinds(segments)).toEqual(["gap-to-now", "card"]);
    expect(segments[0]).toMatchObject({ kind: "gap-to-now", days: 21 });
  });

  it("raises the renewal-warning slot when current is expiring with nothing queued (§D5.2)", () => {
    const expiring = membership({ isExpiringSoon: true, remainingDays: 6 });
    const segments = buildRailSegments([expiring], "2026-06-24");
    expect(kinds(segments)).toEqual(["renewal-warning", "card"]);
    expect(segments[0]).toMatchObject({ kind: "renewal-warning", endsInDays: 6 });
  });

  it("shows no renewal warning when a Next is queued or the member is calm (§0.2)", () => {
    const current = membership({ isExpiringSoon: true, remainingDays: 6 });
    const next = membership({
      status: MembershipStatus.SCHEDULED,
      origin: MembershipOrigin.RENEWAL,
      predecessorMembershipId: current.id,
      startDate: "2026-07-01",
      scheduledEffectiveFrom: "2026-07-01",
    });
    expect(kinds(buildRailSegments([next, current], "2026-06-24"))).toEqual([
      "card",
      "connector",
      "card",
    ]);
    const calm = membership({ isExpiringSoon: false });
    expect(kinds(buildRailSegments([calm], "2026-06-10"))).toEqual(["card"]);
  });

  it("never opens with gap-to-now while a live or queued membership exists", () => {
    const current = membership({});
    expect(kinds(buildRailSegments([current], "2026-06-20"))).toEqual(["card"]);
    const scheduled = membership({
      status: MembershipStatus.SCHEDULED,
      startDate: "2026-09-01",
      effectiveEndDate: "2026-09-30",
      scheduledEffectiveFrom: "2026-09-01",
    });
    expect(kinds(buildRailSegments([scheduled], "2026-08-01"))).toEqual(["card"]);
  });

  it("keeps every card of a long chained history, ordered, with connectors between (scenario H)", () => {
    const months = ["01", "02", "03", "04", "05", "06", "07", "08"];
    const chain: MemberTimelineMembership[] = [];
    months.forEach((mm, i) => {
      chain.push(
        membership({
          status: mm === "08" ? MembershipStatus.ACTIVE : MembershipStatus.EXPIRED,
          origin: i === 0 ? MembershipOrigin.NEW : MembershipOrigin.RENEWAL,
          predecessorMembershipId: chain[i - 1]?.id ?? null,
          startDate: `2026-${mm}-01`,
          effectiveEndDate: `2026-${mm}-28`,
        }),
      );
    });
    // A-1 order: newest first; months are ~contiguous-with-tiny-gaps (28th → 1st = 2-day gaps).
    const newestFirst = [...chain].reverse();
    const segments = buildRailSegments(newestFirst, "2026-08-15");
    const cards = segments.filter((s) => s.kind === "card");
    const connectors = segments.filter((s) => s.kind === "connector");
    expect(cards).toHaveLength(8);
    expect(connectors).toHaveLength(7);
    expect(cards[0]).toMatchObject({ slot: "current" });
    expect(cards.slice(1).every((c) => c.kind === "card" && c.slot === "past")).toBe(true);
  });
});
