import { MembershipStatus, type DurationUnit } from "@pulse/db";
import { addDays, dayDiff, isAfter, isBefore, type IsoDate } from "./dates";

/**
 * Membership status **derivation** (state-machines.md; INV-29/T-6) — the single pure
 * function that decides Active / Scheduled / Frozen / Expired / Cancelled from immutable
 * dates and freeze state, judged against *today* in the gym time zone. Status is **never**
 * read from `cached_status`; the cache is a recomputable accelerator only (DDS §1.6).
 *
 * The crux (advisor #1): a queued successor is **SCHEDULED while its predecessor is
 * non-terminal**, and activates **only when the predecessor is EXPIRED/CANCELLED *and*
 * today ≥ the successor's own start** — keyed on the predecessor's *derived* state, never
 * on the stored `scheduledEffectiveFrom`. That is what keeps INV-13 (no overlap) correct
 * when a freeze extends the predecessor's effective end past the successor's planned date.
 */

/** The immutable + cached fields the derivation reads for one membership. */
export interface MembershipFacts {
  id: string;
  predecessorMembershipId: string | null;
  startDate: IsoDate;
  originalEndDate: IsoDate;
  cachedTotalFrozenDays: number;
  scheduledEffectiveFrom: IsoDate | null;
  activatedAt: Date | null;
  cancelledAt: Date | null;
}

export interface DerivedMembership {
  status: MembershipStatus;
  /** Original end extended by finalized frozen days (T-4); the date status is judged against. */
  effectiveEndDate: IsoDate;
  /** Whole days from today to the effective end (negative once past). Meaningful when live. */
  remainingDays: number;
  /** ACTIVE and within the gym's expiring-soon window (MSH-4). */
  isExpiringSoon: boolean;
  /** A pending SCHEDULED membership whose predecessor has ended and whose start has arrived. */
  isDueForActivation: boolean;
}

const TERMINAL = new Set<MembershipStatus>([MembershipStatus.EXPIRED, MembershipStatus.CANCELLED]);

/**
 * Derive every membership of a single member together (a successor needs its predecessor's
 * derived status). `activeFreezeIds` is the set of membership ids with an open freeze row.
 */
export function deriveMemberLifecycle(
  facts: MembershipFacts[],
  activeFreezeIds: ReadonlySet<string>,
  today: IsoDate,
  windowDays: number,
): Map<string, DerivedMembership> {
  const byId = new Map(facts.map((f) => [f.id, f]));
  const out = new Map<string, DerivedMembership>();

  const resolve = (id: string, visiting: ReadonlySet<string>): DerivedMembership => {
    const cached = out.get(id);
    if (cached) return cached;
    const fact = byId.get(id);
    if (!fact) {
      // Predecessor outside this set (defensive) — treat as ended so a successor can activate.
      return makeDerived(MembershipStatus.EXPIRED, today, today, false, windowDays);
    }
    const derived = derive(fact, visiting);
    out.set(id, derived);
    return derived;
  };

  const derive = (fact: MembershipFacts, visiting: ReadonlySet<string>): DerivedMembership => {
    const effectiveEnd = addDays(fact.originalEndDate, fact.cachedTotalFrozenDays);

    if (fact.cancelledAt)
      return makeDerived(MembershipStatus.CANCELLED, effectiveEnd, today, false, windowDays);
    if (activeFreezeIds.has(fact.id))
      return makeDerived(MembershipStatus.FROZEN, effectiveEnd, today, false, windowDays);

    const isPendingScheduled = fact.scheduledEffectiveFrom !== null && fact.activatedAt === null;
    if (isPendingScheduled) {
      const predTerminal = isPredecessorTerminal(fact, visiting, resolve);
      // Predecessor still live, or our own start hasn't arrived yet → stay queued.
      if (!predTerminal || isBefore(today, fact.startDate)) {
        return makeDerived(MembershipStatus.SCHEDULED, effectiveEnd, today, false, windowDays);
      }
      // Due to activate — fall through to the active/expired judgement, flagged for the writer.
      const status = isAfter(today, effectiveEnd)
        ? MembershipStatus.EXPIRED
        : MembershipStatus.ACTIVE;
      return makeDerived(status, effectiveEnd, today, true, windowDays);
    }

    const status = isAfter(today, effectiveEnd)
      ? MembershipStatus.EXPIRED
      : MembershipStatus.ACTIVE;
    return makeDerived(status, effectiveEnd, today, false, windowDays);
  };

  const isPredecessorTerminal = (
    fact: MembershipFacts,
    visiting: ReadonlySet<string>,
    resolveFn: (id: string, v: ReadonlySet<string>) => DerivedMembership,
  ): boolean => {
    if (!fact.predecessorMembershipId) return true; // no predecessor to wait on
    if (visiting.has(fact.predecessorMembershipId)) return true; // cycle guard (never expected)
    const predStatus = resolveFn(
      fact.predecessorMembershipId,
      new Set([...visiting, fact.id]),
    ).status;
    return TERMINAL.has(predStatus);
  };

  for (const fact of facts) resolve(fact.id, new Set());
  return out;
}

function makeDerived(
  status: MembershipStatus,
  effectiveEndDate: IsoDate,
  today: IsoDate,
  isDueForActivation: boolean,
  windowDays: number,
): DerivedMembership {
  const remainingDays = dayDiff(today, effectiveEndDate);
  const isExpiringSoon =
    status === MembershipStatus.ACTIVE && remainingDays >= 0 && remainingDays <= windowDays;
  return { status, effectiveEndDate, remainingDays, isExpiringSoon, isDueForActivation };
}

/** Re-exported for callers composing snapshots (kept beside the derivation it pairs with). */
export type { DurationUnit };
