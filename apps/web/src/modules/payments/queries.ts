import { requireSession } from "@/lib/auth/guard";
import { getMembershipBilling, type MembershipBilling } from "./service";

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
