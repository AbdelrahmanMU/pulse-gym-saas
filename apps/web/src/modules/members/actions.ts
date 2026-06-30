"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import {
  archiveMember,
  assignTrainer,
  createMember,
  reactivateMember,
  unassignTrainer,
  updateMember,
  type ActionState,
} from "./service";

/**
 * `"use server"` wrappers for Member Management (Sprint-1 Epic-2). Each resolves the
 * current principal (never trusts client-supplied identity/scope), delegates to the
 * testable {@link ./service} core, then revalidates affected paths. Shaped for
 * `useActionState` — returns an {@link ActionState}; typed auth/tenancy errors thrown by
 * the service propagate to the route error boundary. The member id always rides a hidden
 * form field; tenancy is enforced in the service (`assertSameGym` → 404), never trusted.
 */

const str = (form: FormData, key: string): string | undefined => {
  const v = form.get(key);
  return typeof v === "string" ? v : undefined;
};

const memberFields = (form: FormData) => ({
  fullName: str(form, "fullName"),
  phone: str(form, "phone"),
  email: str(form, "email"),
  dateOfBirth: str(form, "dateOfBirth"),
  gender: str(form, "gender"),
  joinedOn: str(form, "joinedOn"),
});

export async function createMemberAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  const result = await createMember(principal, memberFields(form));
  if (result.status === "success" && result.memberId) {
    revalidatePath("/members");
    redirect(`/members/${result.memberId}`);
  }
  return result;
}

export async function updateMemberAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  const memberId = str(form, "memberId") ?? "";
  const result = await updateMember(principal, memberId, memberFields(form));
  if (result.status === "success") {
    revalidatePath("/members");
    revalidatePath(`/members/${memberId}`);
    redirect(`/members/${memberId}`);
  }
  return result;
}

export async function archiveMemberAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const memberId = str(form, "memberId") ?? "";
  const result = await archiveMember(principal, memberId);
  if (result.status === "success") revalidateMember(memberId);
  return result;
}

export async function reactivateMemberAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const memberId = str(form, "memberId") ?? "";
  const result = await reactivateMember(principal, memberId);
  if (result.status === "success") revalidateMember(memberId);
  return result;
}

export async function assignTrainerAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const memberId = str(form, "memberId") ?? "";
  const result = await assignTrainer(principal, memberId, {
    trainerGymUserId: str(form, "trainerGymUserId"),
  });
  if (result.status === "success") revalidateMember(memberId);
  return result;
}

export async function unassignTrainerAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const memberId = str(form, "memberId") ?? "";
  const result = await unassignTrainer(principal, memberId);
  if (result.status === "success") revalidateMember(memberId);
  return result;
}

function revalidateMember(memberId: string): void {
  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
}
