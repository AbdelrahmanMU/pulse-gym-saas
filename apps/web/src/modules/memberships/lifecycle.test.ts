import { describe, expect, it } from "vitest";
import { MembershipStatus } from "@pulse/db";
import { deriveMemberLifecycle, type MembershipFacts } from "./lifecycle";

/**
 * Membership status derivation (state-machines.md; INV-12/13/29). The crux these tests pin
 * down (advisor #1): a queued successor activates off its **predecessor's derived terminal
 * state**, never the stored `scheduledEffectiveFrom` — so a freeze that extends the
 * predecessor's effective end can never let two periods be live at once (INV-13).
 */
const ACTIVATED = new Date("2026-01-01T00:00:00.000Z");

function fact(over: Partial<MembershipFacts> & Pick<MembershipFacts, "id">): MembershipFacts {
  return {
    predecessorMembershipId: null,
    startDate: "2026-01-01",
    originalEndDate: "2026-01-31",
    cachedTotalFrozenDays: 0,
    scheduledEffectiveFrom: null,
    activatedAt: ACTIVATED,
    cancelledAt: null,
    ...over,
  };
}

const NONE = new Set<string>();

describe("single membership", () => {
  it("is ACTIVE within its period", () => {
    const d = deriveMemberLifecycle([fact({ id: "m1" })], NONE, "2026-01-15", 7);
    expect(d.get("m1")?.status).toBe(MembershipStatus.ACTIVE);
    expect(d.get("m1")?.remainingDays).toBe(16);
    expect(d.get("m1")?.isExpiringSoon).toBe(false);
  });

  it("flags Expiring Soon inside the window (inclusive of the end day)", () => {
    const d = deriveMemberLifecycle([fact({ id: "m1" })], NONE, "2026-01-28", 7);
    expect(d.get("m1")?.status).toBe(MembershipStatus.ACTIVE);
    expect(d.get("m1")?.isExpiringSoon).toBe(true);
  });

  it("is EXPIRED the day after the inclusive end (T-3)", () => {
    const onEnd = deriveMemberLifecycle([fact({ id: "m1" })], NONE, "2026-01-31", 7);
    expect(onEnd.get("m1")?.status).toBe(MembershipStatus.ACTIVE); // still the inclusive last day
    const afterEnd = deriveMemberLifecycle([fact({ id: "m1" })], NONE, "2026-02-01", 7);
    expect(afterEnd.get("m1")?.status).toBe(MembershipStatus.EXPIRED);
  });

  it("is FROZEN when it has an open freeze", () => {
    const d = deriveMemberLifecycle([fact({ id: "m1" })], new Set(["m1"]), "2026-01-15", 7);
    expect(d.get("m1")?.status).toBe(MembershipStatus.FROZEN);
    expect(d.get("m1")?.isExpiringSoon).toBe(false);
  });

  it("is CANCELLED when cancelledAt is set (terminal, overrides dates)", () => {
    const d = deriveMemberLifecycle(
      [fact({ id: "m1", cancelledAt: new Date("2026-01-12T00:00:00.000Z") })],
      NONE,
      "2026-01-15",
      7,
    );
    expect(d.get("m1")?.status).toBe(MembershipStatus.CANCELLED);
  });

  it("extends the effective end by finalized frozen days (FRZ-2/INV-18)", () => {
    const d = deriveMemberLifecycle(
      [fact({ id: "m1", cachedTotalFrozenDays: 10 })],
      NONE,
      "2026-02-05",
      7,
    );
    expect(d.get("m1")?.effectiveEndDate).toBe("2026-02-10"); // Jan 31 + 10 days
    expect(d.get("m1")?.status).toBe(MembershipStatus.ACTIVE);
  });
});

describe("scheduled successor (deferred upgrade / early renewal)", () => {
  const current = fact({ id: "m1", originalEndDate: "2026-01-31" });
  const next = fact({
    id: "m2",
    predecessorMembershipId: "m1",
    startDate: "2026-02-01",
    originalEndDate: "2026-03-03",
    scheduledEffectiveFrom: "2026-02-01",
    activatedAt: null,
  });

  it("stays SCHEDULED while the predecessor is still live", () => {
    const d = deriveMemberLifecycle([current, next], NONE, "2026-01-20", 7);
    expect(d.get("m1")?.status).toBe(MembershipStatus.ACTIVE);
    expect(d.get("m2")?.status).toBe(MembershipStatus.SCHEDULED);
    expect(d.get("m2")?.isDueForActivation).toBe(false);
  });

  it("activates only once the predecessor is EXPIRED and its own start has arrived", () => {
    const d = deriveMemberLifecycle([current, next], NONE, "2026-02-01", 7);
    expect(d.get("m1")?.status).toBe(MembershipStatus.EXPIRED);
    expect(d.get("m2")?.status).toBe(MembershipStatus.ACTIVE);
    expect(d.get("m2")?.isDueForActivation).toBe(true);
  });

  it("does NOT activate early when a freeze extends the predecessor past the successor's date (INV-13)", () => {
    // Predecessor frozen-extended to Feb 10; the successor's planned Feb 1 must NOT win.
    const extended = fact({ id: "m1", originalEndDate: "2026-01-31", cachedTotalFrozenDays: 10 });
    const d = deriveMemberLifecycle([extended, next], NONE, "2026-02-01", 7);
    expect(d.get("m1")?.status).toBe(MembershipStatus.ACTIVE); // effective end Feb 10
    expect(d.get("m2")?.status).toBe(MembershipStatus.SCHEDULED); // keyed on predecessor state
  });

  it("when the predecessor is cancelled early, the successor waits for its own start", () => {
    const cancelledCurrent = fact({ id: "m1", cancelledAt: new Date("2026-01-10T00:00:00Z") });
    const before = deriveMemberLifecycle([cancelledCurrent, next], NONE, "2026-01-15", 7);
    expect(before.get("m2")?.status).toBe(MembershipStatus.SCHEDULED); // own start (Feb 1) not reached
    const after = deriveMemberLifecycle([cancelledCurrent, next], NONE, "2026-02-02", 7);
    expect(after.get("m2")?.status).toBe(MembershipStatus.ACTIVE);
  });
});
