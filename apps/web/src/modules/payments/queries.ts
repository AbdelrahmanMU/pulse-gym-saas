import { requireSession } from "@/lib/auth/guard";
import {
  getMemberOutstandingBalance,
  getMemberPaymentSummaries,
  getMembershipBilling,
  type MemberOutstandingBalance,
  type MembershipPaymentSummary,
  type MembershipBilling,
} from "./service";

/**
 * RSC read entry point for Payments (Sprint-1 Epic-5). Resolves the authenticated principal (the
 * `(app)` layout already enforced the session) and delegates to the {@link ./service} core, which
 * authorizes **by permission** (`payments.read`) and scopes by gymId. Pages call this; they never
 * read the session or query Prisma directly (constitution §2). The membership detail page composes
 * this through the module's public surface — never reaching into internals.
 */
export async function loadMembershipBilling(membershipId: string): Promise<MembershipBilling> {
  const principal = await requireSession();
  return getMembershipBilling(principal, membershipId);
}

/**
 * The member's aggregate owed-now total (the AnswerStrip's one money fact — workspace W1).
 * Same service core the archive policy composes; `payments.read`-gated, gym-scoped.
 */
export async function loadMemberOutstandingBalance(
  memberId: string,
): Promise<MemberOutstandingBalance> {
  const principal = await requireSession();
  return getMemberOutstandingBalance(principal, memberId);
}

/**
 * Per-membership derived money facts for the member rail (workspace W2) — one read for every
 * card's header money fact and Payments panel; `payments.read`-gated in the service.
 */
export async function loadMemberPaymentSummaries(
  memberId: string,
): Promise<MembershipPaymentSummary[]> {
  const principal = await requireSession();
  return getMemberPaymentSummaries(principal, memberId);
}
