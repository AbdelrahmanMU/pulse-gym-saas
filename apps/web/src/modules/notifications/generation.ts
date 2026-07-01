import { NotificationType, NotificationState } from "@pulse/db";
import type { ExpiryCandidate } from "@/modules/memberships";

/**
 * Notification generation & state-transition **rules** (Sprint-1 Epic-7) — the pure, testable core
 * (mirrors `lifecycle.ts` / `ledger.ts`). It maps a membership expiry candidate (derived in the
 * memberships module) onto the row that materializes it, and encodes the legal state progression.
 *
 * Non-duplication (NTF-3 / INV-33 / INV-34) is realized by the **`dedupeKey`** — unique per gym —
 * combined with `createMany({ skipDuplicates: true })`: the same membership + type + effective-end
 * event is written exactly once, and a dismissed row keeps its key so it is never resurrected. The
 * effective-end date is part of the key, so a freeze-extended re-expiry is a *new* qualifying event.
 */

/** The persisted shape of a generated notification (before DB defaults for id/state/generatedAt). */
export interface NotificationInput {
  gymId: string;
  type: NotificationType;
  memberId: string;
  membershipId: string;
  dedupeKey: string;
  message: string;
}

const EVENT_TYPE: Record<ExpiryCandidate["event"], NotificationType> = {
  EXPIRING_SOON: NotificationType.MEMBERSHIP_EXPIRING_SOON,
  EXPIRED: NotificationType.MEMBERSHIP_EXPIRED,
};

/** Build the notification row for one expiry candidate. Message stores the **absolute** end date. */
export function buildNotificationInput(
  candidate: ExpiryCandidate,
  gymId: string,
): NotificationInput {
  const type = EVENT_TYPE[candidate.event];
  return {
    gymId,
    type,
    memberId: candidate.memberId,
    membershipId: candidate.membershipId,
    // Encodes (membership, type, period) — the period is the effective end date (DDS §2.16).
    dedupeKey: `${candidate.membershipId}:${type}:${candidate.effectiveEndDate}`,
    message: buildMessage(candidate),
  };
}

function buildMessage(candidate: ExpiryCandidate): string {
  const subject = `${candidate.memberName}’s ${candidate.planName} membership`;
  return candidate.event === "EXPIRING_SOON"
    ? `${subject} expires on ${candidate.effectiveEndDate}.`
    : `${subject} expired on ${candidate.effectiveEndDate}.`;
}

/**
 * The system-default recent window (in days) for **Expired** notifications (NTF-5). An expiry alert
 * is operational only while the membership expired within this many days of its effective end date;
 * older lapses are historical records, not alerts. A fixed default (single source of truth) — a
 * per-gym override (`Gym.expiredNotificationWindowDays`, mirroring `expiringSoonWindowDays`) is a
 * documented future promotion, not built here.
 */
export const EXPIRED_NOTIFICATION_WINDOW_DAYS = 7;

/**
 * NTF-5 generation policy: EXPIRING_SOON candidates are always notifiable; EXPIRED candidates only
 * while within the recent window (`remainingDays >= -window`, i.e. at most `window` days past the
 * effective end date). This bounds **generation only** — the lifecycle read stays unbounded, so
 * dashboards/reports/history are unaffected.
 */
export function isWithinNotificationWindow(
  candidate: ExpiryCandidate,
  expiredWindowDays: number = EXPIRED_NOTIFICATION_WINDOW_DAYS,
): boolean {
  if (candidate.event !== "EXPIRED") return true;
  return candidate.remainingDays >= -expiredWindowDays;
}

/**
 * The legal notification state progression (state-machines §3 / NTF-4): UNREAD → READ → DISMISSED,
 * plus the UNREAD → DISMISSED shortcut. A DISMISSED alert is terminal (INV-34); READ never reverts
 * to UNREAD. A transition to the *current* state is handled as an idempotent no-op by the caller.
 */
const ALLOWED: Record<NotificationState, ReadonlySet<NotificationState>> = {
  [NotificationState.UNREAD]: new Set([NotificationState.READ, NotificationState.DISMISSED]),
  [NotificationState.READ]: new Set([NotificationState.DISMISSED]),
  [NotificationState.DISMISSED]: new Set(),
};

export function canTransition(from: NotificationState, to: NotificationState): boolean {
  return ALLOWED[from].has(to);
}
