import { describe, expect, it } from "vitest";
import { NotificationState, NotificationType } from "@pulse/db";
import type { ExpiryCandidate } from "@/modules/memberships";
import { buildNotificationInput, canTransition } from "./generation";

/**
 * Notification generation + transition rules (Epic-7) — P0 business invariants: the dedupeKey is the
 * non-duplication contract (NTF-3/INV-33/INV-34), the message pins the **absolute** end date so it
 * can't go stale, and the state progression is one-way (Unread → Read → Dismissed; a dismissed alert
 * is terminal — INV-34).
 */
const candidate = (over: Partial<ExpiryCandidate>): ExpiryCandidate => ({
  membershipId: "mem-1",
  memberId: "mbr-1",
  memberName: "Dana Ray",
  planName: "Gold Monthly",
  effectiveEndDate: "2026-02-10",
  remainingDays: 5,
  event: "EXPIRING_SOON",
  ...over,
});

describe("buildNotificationInput", () => {
  it("maps EXPIRING_SOON onto the type, key, and a dated message", () => {
    const input = buildNotificationInput(candidate({}), "gym-1");
    expect(input.type).toBe(NotificationType.MEMBERSHIP_EXPIRING_SOON);
    expect(input.gymId).toBe("gym-1");
    expect(input.memberId).toBe("mbr-1");
    expect(input.membershipId).toBe("mem-1");
    expect(input.dedupeKey).toBe("mem-1:MEMBERSHIP_EXPIRING_SOON:2026-02-10");
    expect(input.message).toContain("expires on 2026-02-10");
  });

  it("maps EXPIRED onto its type, key, and message", () => {
    const input = buildNotificationInput(candidate({ event: "EXPIRED" }), "gym-1");
    expect(input.type).toBe(NotificationType.MEMBERSHIP_EXPIRED);
    expect(input.dedupeKey).toBe("mem-1:MEMBERSHIP_EXPIRED:2026-02-10");
    expect(input.message).toContain("expired on 2026-02-10");
  });

  it("produces a stable key for the same event (idempotent re-generation)", () => {
    const a = buildNotificationInput(candidate({}), "gym-1");
    const b = buildNotificationInput(candidate({}), "gym-1");
    expect(a.dedupeKey).toBe(b.dedupeKey);
  });

  it("produces a NEW key when a freeze extends the end date (a new qualifying event)", () => {
    const before = buildNotificationInput(candidate({ effectiveEndDate: "2026-02-10" }), "gym-1");
    const after = buildNotificationInput(candidate({ effectiveEndDate: "2026-02-20" }), "gym-1");
    expect(after.dedupeKey).not.toBe(before.dedupeKey);
  });
});

describe("canTransition", () => {
  const { UNREAD, READ, DISMISSED } = NotificationState;

  it("allows the forward progression Unread → Read → Dismissed", () => {
    expect(canTransition(UNREAD, READ)).toBe(true);
    expect(canTransition(READ, DISMISSED)).toBe(true);
    expect(canTransition(UNREAD, DISMISSED)).toBe(true);
  });

  it("forbids reopening a read or dismissed alert (INV-34)", () => {
    expect(canTransition(READ, UNREAD)).toBe(false);
    expect(canTransition(DISMISSED, READ)).toBe(false);
    expect(canTransition(DISMISSED, UNREAD)).toBe(false);
  });
});
