import { MembershipOrigin, MembershipStatus } from "@pulse/db";
import { dayDiff, type IsoDate } from "./dates";
import type { MemberTimelineMembership } from "./service";

/**
 * Rail composition model (member workspace W2, catalog §13.4) — the pure adjacency grammar
 * that turns the A-1 timeline (newest first) into rail segments: cards, origin-labeled
 * transition connectors, explicit coverage-gap markers, and the lapsed gap-to-now head.
 * Presentation-only: every date/status/origin arrives fully derived from A-1; this module
 * does adjacency arithmetic and copy classification, never lifecycle rules.
 */

/** Where a card sits operationally (INV-12 guarantees ≤1 current and ≤1 next). */
export type RailSlot = "current" | "next" | "past";

export type ConnectorVariant = "renewed" | "upgraded" | "smaller-plan";

export type RailSegment =
  | {
      /** The member is lapsed: days since their last coverage ended (D10). */
      kind: "gap-to-now";
      days: number;
    }
  | {
      /**
       * The renewal question is live (§D5.2): current is expiring-soon and nothing is queued.
       * W2 renders the warning; its inline Renew action arrives with W3 (actions phase).
       */
      kind: "renewal-warning";
      endsInDays: number;
    }
  | {
      kind: "card";
      membership: MemberTimelineMembership;
      slot: RailSlot;
      /** The rail line visibly stops under a cancelled card (§D2.5). */
      severedBelow: boolean;
    }
  | {
      /** Transition between two chained cards; sits under the newer card (§D2.4). */
      kind: "connector";
      variant: ConnectorVariant;
      soldOn: IsoDate;
      fromPlan: string;
      toPlan: string;
    }
  | {
      /** Days with no coverage between two adjacent cards (§D2.1). */
      kind: "gap";
      days: number;
    };

const CONNECTOR_BY_ORIGIN: Partial<Record<MembershipOrigin, ConnectorVariant>> = {
  [MembershipOrigin.RENEWAL]: "renewed",
  [MembershipOrigin.UPGRADE]: "upgraded",
  [MembershipOrigin.DOWNGRADE]: "smaller-plan",
};

export function railSlot(status: MembershipStatus): RailSlot {
  if (status === MembershipStatus.SCHEDULED) return "next";
  if (status === MembershipStatus.ACTIVE || status === MembershipStatus.FROZEN) return "current";
  return "past";
}

/** The day the card's coverage actually ended/ends: a cancellation cuts it short. */
function coverageEnd(m: MemberTimelineMembership): IsoDate {
  return m.status === MembershipStatus.CANCELLED && m.cancelledOn
    ? m.cancelledOn
    : m.effectiveEndDate;
}

/**
 * `memberships` must be the A-1 order (newest first). Segments come back in render order,
 * top → bottom; the caller appends the terminus ("Joined the gym") itself.
 */
export function buildRailSegments(
  memberships: readonly MemberTimelineMembership[],
  today: IsoDate,
): RailSegment[] {
  const segments: RailSegment[] = [];
  const newest = memberships[0];

  // Lapsed head: the story's top is a terminal card → say how long the member has been
  // uncovered (D10 "No membership · N days and counting").
  if (newest && railSlot(newest.status) === "past") {
    const days = dayDiff(coverageEnd(newest), today);
    if (days > 0) segments.push({ kind: "gap-to-now", days });
  }

  // Conditional Next slot as a *warning* (§D5.2): the newest card is the current one, it is
  // expiring soon, and no successor is queued — absence becomes preattentive exactly when it
  // matters. A calm mid-term member gets no slot at all (absence-blindness rule, §0.2).
  if (newest && railSlot(newest.status) === "current" && newest.isExpiringSoon) {
    segments.push({ kind: "renewal-warning", endsInDays: newest.remainingDays });
  }

  memberships.forEach((m, i) => {
    segments.push({
      kind: "card",
      membership: m,
      slot: railSlot(m.status),
      severedBelow: m.status === MembershipStatus.CANCELLED,
    });

    const older = memberships[i + 1];
    if (!older) return;

    const connectorVariant =
      m.predecessorMembershipId === older.id ? CONNECTOR_BY_ORIGIN[m.origin] : undefined;
    if (connectorVariant) {
      segments.push({
        kind: "connector",
        variant: connectorVariant,
        soldOn: m.soldOn,
        fromPlan: older.planName,
        toPlan: m.planName,
      });
    }

    // Inclusive end: a contiguous successor starts the very next day → zero gap. A gap can
    // coexist with a connector (e.g. a chained successor scheduled after a cancellation cut).
    const gapDays = dayDiff(coverageEnd(older), m.startDate) - 1;
    if (gapDays > 0) segments.push({ kind: "gap", days: gapDays });
  });

  return segments;
}
