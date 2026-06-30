import { MembershipStatus } from "@pulse/db";

/**
 * Presentation helpers for Membership Lifecycle (no business logic — that lives in
 * `lifecycle.ts`/`dates.ts`). Pure string formatting for the UI.
 */

/** A human "remaining days" phrase for the membership's current state (gym-tz judged upstream). */
export function remainingDaysLabel(status: MembershipStatus, remainingDays: number): string {
  switch (status) {
    case MembershipStatus.ACTIVE:
      if (remainingDays < 0) return "Ended";
      if (remainingDays === 0) return "Expires today";
      return `${remainingDays} day${remainingDays === 1 ? "" : "s"} left`;
    case MembershipStatus.FROZEN:
      return "Paused";
    case MembershipStatus.SCHEDULED:
      return "Not started yet";
    case MembershipStatus.EXPIRED:
      return "Expired";
    case MembershipStatus.CANCELLED:
      return "Cancelled";
    default:
      return "—";
  }
}
