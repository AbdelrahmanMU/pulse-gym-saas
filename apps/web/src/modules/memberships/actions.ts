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
 * principal (never trusts client-supplied identity/scope), delegates to the testable
 * {@link ./service} core, then revalidates affected paths. Shaped for `useActionState`. Ids ride
 * hidden form fields; tenancy is enforced in the service (`assertSameGym` → 404), never trusted.
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
  const result = await renewMembership(principal, membershipId);
  if (result.status === "success" && result.membershipId) {
    revalidateMembership(membershipId);
    redirect(`/memberships/${result.membershipId}`);
  }
  return result;
}

export async function upgradeMembershipAction(
  _prev: CreateMembershipResult,
  form: FormData,
): Promise<CreateMembershipResult> {
  const principal = await currentUser.require();
  const membershipId = str(form, "membershipId") ?? "";
  const result = await upgradeMembership(principal, membershipId, { planId: str(form, "planId") });
  if (result.status === "success" && result.membershipId) {
    revalidateMembership(membershipId);
    redirect(`/memberships/${result.membershipId}`);
  }
  return result;
}

export async function freezeMembershipAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const membershipId = str(form, "membershipId") ?? "";
  const result = await freezeMembership(principal, membershipId, {
    frozenDays: str(form, "frozenDays"),
  });
  if (result.status === "success") revalidateMembership(membershipId);
  return result;
}

export async function resumeMembershipAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const membershipId = str(form, "membershipId") ?? "";
  const result = await resumeMembership(principal, membershipId);
  if (result.status === "success") revalidateMembership(membershipId);
  return result;
}

export async function cancelMembershipAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const membershipId = str(form, "membershipId") ?? "";
  const result = await cancelMembership(principal, membershipId);
  if (result.status === "success") revalidateMembership(membershipId);
  return result;
}

function revalidateMembership(membershipId: string): void {
  revalidatePath("/memberships");
  revalidatePath(`/memberships/${membershipId}`);
}
