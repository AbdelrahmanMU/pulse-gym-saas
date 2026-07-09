"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import {
  cancelMembership,
  createMembership,
  freezeMembership,
  renewMembership,
  resumeMembership,
  upgradeMembership,
  type ActionState,
  type CreateMembershipResult,
} from "./service";

/**
 * `"use server"` wrappers for Membership Lifecycle (Sprint-1 Epic-4). Each resolves the current
 * principal (never trusts client-supplied identity/scope) and delegates to the testable
 * {@link ./service} core. Shaped for `useActionState`. Ids ride hidden form fields; tenancy is
 * enforced in the service (`assertSameGym` → 404), never trusted.
 *
 * Post-success freshness (Performance Recovery sprint): the lifecycle actions return a PLAIN
 * result — no `revalidatePath`, no `redirect`. In production builds, an action response that
 * re-renders the current route in place (revalidation of this page's path, or a redirect back
 * to it) intermittently suspends React's pending form state forever — the button sticks on its
 * pending label and the UI never updates (data/timing-sensitive race; reproduced on Next 15.5
 * and 16.2, never in dev). The submitting forms instead perform a **full-document navigation**
 * on success (`useFullNavigationOnSuccess`), which re-renders everything from the server and
 * resets the client router cache — the same freshness `revalidatePath` provided, minus the
 * deadlock. `createMembershipAction` keeps its server redirect: it navigates to a *different*
 * route (`/memberships/new` → the new detail page), which never exhibited the race.
 */

const str = (form: FormData, key: string): string | undefined => {
  const v = form.get(key);
  return typeof v === "string" ? v : undefined;
};

export async function createMembershipAction(
  _prev: CreateMembershipResult,
  form: FormData,
): Promise<CreateMembershipResult> {
  const principal = await currentUser.require();
  const result = await createMembership(principal, {
    memberId: str(form, "memberId"),
    planId: str(form, "planId"),
    startDate: str(form, "startDate"),
  });
  if (result.status === "success" && result.membershipId) {
    revalidatePath("/memberships");
    revalidatePath("/dashboard"); // membership-status KPIs + outstanding
    redirect(`/memberships/${result.membershipId}`);
  }
  return result;
}

export async function renewMembershipAction(
  _prev: CreateMembershipResult,
  form: FormData,
): Promise<CreateMembershipResult> {
  const principal = await currentUser.require();
  const membershipId = str(form, "membershipId") ?? "";
  return renewMembership(principal, membershipId);
}

export async function upgradeMembershipAction(
  _prev: CreateMembershipResult,
  form: FormData,
): Promise<CreateMembershipResult> {
  const principal = await currentUser.require();
  const membershipId = str(form, "membershipId") ?? "";
  return upgradeMembership(principal, membershipId, { planId: str(form, "planId") });
}

export async function freezeMembershipAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const membershipId = str(form, "membershipId") ?? "";
  return freezeMembership(principal, membershipId, {
    frozenDays: str(form, "frozenDays"),
  });
}

export async function resumeMembershipAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const membershipId = str(form, "membershipId") ?? "";
  return resumeMembership(principal, membershipId);
}

export async function cancelMembershipAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const membershipId = str(form, "membershipId") ?? "";
  return cancelMembership(principal, membershipId);
}
