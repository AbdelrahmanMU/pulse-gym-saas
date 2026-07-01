import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { getMemberMembershipStanding } from "@/modules/memberships";
import { getMemberOutstandingBalance } from "@/modules/payments";

/**
 * Member lifecycle **policy layer** — the single home for Member business policies that must
 * compose OTHER modules' state. It reaches those modules **only through their public index**
 * (`@/modules/memberships`, `@/modules/payments`; constitution §2, `no-cross-context`), never
 * their internals, and never re-derives membership status or balance here (single ownership).
 *
 * The archive policy (ARC-3 / INV-11) is the first policy implemented: a Member may be archived
 * only if they have **no Active membership, no Scheduled membership, and no Outstanding Balance**.
 * Future member-lifecycle policies (e.g. delete/merge eligibility) belong here too. The
 * {@link ../service member service} calls `evaluateMemberArchive` inside its archive command and
 * maps a non-archivable result to a user-facing error via {@link archiveBlockedMessage}.
 */
export type ArchiveBlockReason =
  | "ACTIVE_MEMBERSHIP"
  | "SCHEDULED_MEMBERSHIP"
  | "OUTSTANDING_BALANCE";

export interface ArchiveEligibility {
  archivable: boolean;
  /** Every reason archive is blocked (order: active, scheduled, outstanding) — empty when eligible. */
  blocks: ArchiveBlockReason[];
}

/**
 * Evaluate whether a member may be archived (ARC-3 / INV-11). Composes the memberships +
 * payments public reads (each authorizes its own permission — `memberships.read` /
 * `payments.read`, which every role holding `members.archive` also holds). The membership
 * standing is judged from **derived** status in the gym time zone; the `clock` is threaded so
 * callers/tests get deterministic derivation. Read-only — no writes on this path.
 */
export async function evaluateMemberArchive(
  principal: AuthenticatedPrincipal,
  memberId: string,
  clock?: IClock,
): Promise<ArchiveEligibility> {
  const [standing, balance] = await Promise.all([
    getMemberMembershipStanding(principal, memberId, clock),
    getMemberOutstandingBalance(principal, memberId),
  ]);

  const blocks: ArchiveBlockReason[] = [];
  if (standing.hasActiveMembership) blocks.push("ACTIVE_MEMBERSHIP");
  if (standing.hasScheduledMembership) blocks.push("SCHEDULED_MEMBERSHIP");
  if (balance.hasOutstanding) blocks.push("OUTSTANDING_BALANCE");

  return { archivable: blocks.length === 0, blocks };
}

const REASON_PHRASE: Record<ArchiveBlockReason, string> = {
  ACTIVE_MEMBERSHIP: "an active membership",
  SCHEDULED_MEMBERSHIP: "a scheduled membership",
  OUTSTANDING_BALANCE: "an outstanding balance",
};

/** A single user-facing sentence enumerating why archive is blocked (ARC-3 / INV-11). */
export function archiveBlockedMessage(blocks: readonly ArchiveBlockReason[]): string {
  const phrases = blocks.map((b) => REASON_PHRASE[b]);
  const list =
    phrases.length <= 1
      ? (phrases[0] ?? "")
      : `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
  return `This member can't be archived while they have ${list}. Resolve these first.`;
}
