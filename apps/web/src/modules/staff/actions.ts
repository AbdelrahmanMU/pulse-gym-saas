"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import {
  assignRole,
  createStaff,
  reactivateStaff,
  suspendStaff,
  updateStaff,
  type ActionState,
} from "./service";

/**
 * `"use server"` wrappers for User & Staff Management (Sprint-1 Epic-9). Each resolves the current
 * principal (never trusts client-supplied identity/scope), delegates to the testable {@link ./service}
 * core, then revalidates. Shaped for `useActionState`. The GymUser id rides a hidden form field;
 * tenancy is enforced in the service (`assertSameGym` → 404), never trusted. The temporary password
 * is read from the form and hashed in the service — it is never logged.
 */

const str = (form: FormData, key: string): string | undefined => {
  const v = form.get(key);
  return typeof v === "string" ? v : undefined;
};

export async function createStaffAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  const result = await createStaff(principal, {
    displayName: str(form, "displayName"),
    email: str(form, "email"),
    phone: str(form, "phone"),
    roleId: str(form, "roleId"),
    temporaryPassword: str(form, "temporaryPassword"),
  });
  if (result.status === "success" && result.gymUserId) {
    revalidatePath("/staff");
    redirect(`/staff/${result.gymUserId}`);
  }
  return result;
}

export async function updateStaffAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  const gymUserId = str(form, "gymUserId") ?? "";
  const result = await updateStaff(principal, gymUserId, {
    displayName: str(form, "displayName"),
    phone: str(form, "phone"),
  });
  if (result.status === "success") {
    revalidateStaff(gymUserId);
    redirect(`/staff/${gymUserId}`);
  }
  return result;
}

export async function assignRoleAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  const gymUserId = str(form, "gymUserId") ?? "";
  const result = await assignRole(principal, gymUserId, { roleId: str(form, "roleId") });
  if (result.status === "success") revalidateStaff(gymUserId);
  return result;
}

export async function suspendStaffAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  const gymUserId = str(form, "gymUserId") ?? "";
  const result = await suspendStaff(principal, gymUserId);
  if (result.status === "success") revalidateStaff(gymUserId);
  return result;
}

export async function reactivateStaffAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const gymUserId = str(form, "gymUserId") ?? "";
  const result = await reactivateStaff(principal, gymUserId);
  if (result.status === "success") revalidateStaff(gymUserId);
  return result;
}

function revalidateStaff(gymUserId: string): void {
  revalidatePath("/staff");
  revalidatePath(`/staff/${gymUserId}`);
}
