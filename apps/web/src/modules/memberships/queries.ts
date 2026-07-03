import { requireSession } from "@/lib/auth/guard";
import {
  getMembership,
  getMemberMembershipStanding,
  getMemberMembershipTimeline,
  listMemberships,
  listSellableMembers,
  listSellablePlans,
  type MemberMembershipStanding,
  type MemberMembershipTimeline,
  type MemberOption,
  type MembershipDetail,
  type MembershipListResult,
  type PlanOption,
} from "./service";
import { MembershipListParamsSchema } from "./validation";

/**
 * RSC read entry points for Membership Lifecycle (Sprint-1 Epic-4). They resolve the
 * authenticated principal (the `(app)` layout already enforced the session) and delegate to the
 * {@link ./service} core, which authorizes **by permission** and scopes by gymId. Pages call
 * these; they never read the session or query Prisma directly (constitution §2).
 */
export async function loadMemberships(
  rawParams: Record<string, string | undefined>,
): Promise<MembershipListResult> {
  const principal = await requireSession();
  return listMemberships(principal, MembershipListParamsSchema.parse(rawParams));
}

export async function loadMembership(membershipId: string): Promise<MembershipDetail> {
  const principal = await requireSession();
  return getMembership(principal, membershipId);
}

export async function loadSellableMembers(): Promise<MemberOption[]> {
  const principal = await requireSession();
  return listSellableMembers(principal);
}

export async function loadSellablePlans(): Promise<PlanOption[]> {
  const principal = await requireSession();
  return listSellablePlans(principal);
}

/**
 * Live/paused/pending membership standing for one member — the member profile's P0
 * operational strip (v1.2 §6, DD-9). Same public derived read the archive policy composes;
 * gated by `memberships.read` in the service.
 */
export async function loadMemberMembershipStanding(
  memberId: string,
): Promise<MemberMembershipStanding> {
  const principal = await requireSession();
  return getMemberMembershipStanding(principal, memberId);
}

/**
 * A-1 — the member's whole membership story for the workspace rail (phase W2). Read-only
 * composition of the lifecycle derivation; `memberships.read`-gated in the service.
 */
export async function loadMemberMembershipTimeline(
  memberId: string,
): Promise<MemberMembershipTimeline> {
  const principal = await requireSession();
  return getMemberMembershipTimeline(principal, memberId);
}
