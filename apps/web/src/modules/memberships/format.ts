import { MembershipStatus } from "@pulse/db";

/**
 * Presentation helpers for Membership Lifecycle (no business logic — that lives in
 * `lifecycle.ts`/`dates.ts`). Pure, locale-agnostic: returns a translation key + ICU values in
 * the `memberships` namespace, which the caller renders with its own translator. Keeping the
 * function translator-free preserves its testability and avoids coupling it to a request context.
 */
export interface RemainingDaysLabel {
  key: string;
  values?: Record<string, string | number>;
}

/** The `memberships`-namespace key (+ plural values) for the membership's current-state phrase. */
export function remainingDaysLabel(
  status: MembershipStatus,
  remainingDays: number,
): RemainingDaysLabel {
  switch (status) {
    case MembershipStatus.ACTIVE:
      if (remainingDays < 0) return { key: "remainingEnded" };
      if (remainingDays === 0) return { key: "remainingExpiresToday" };
      return {
        key: "remainingDaysLeft",
        values: { days: remainingDays, n: String(remainingDays) },
      };
    case MembershipStatus.FROZEN:
      return { key: "remainingPaused" };
    case MembershipStatus.SCHEDULED:
      return { key: "remainingNotStarted" };
    case MembershipStatus.EXPIRED:
      return { key: "remainingExpired" };
    case MembershipStatus.CANCELLED:
      return { key: "remainingCancelled" };
    default:
      return { key: "remainingDash" };
  }
}
