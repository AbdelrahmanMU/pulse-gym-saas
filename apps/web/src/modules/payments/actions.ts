"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth/current-user";
import { recordPayment, voidPayment, type ActionState } from "./service";

/**
 * `"use server"` wrappers for Payments (Sprint-1 Epic-5). Each resolves the current principal
 * (never trusts client-supplied identity/scope), delegates to the testable {@link ./service} core,
 * then revalidates the affected membership detail. Shaped for `useActionState`. The membership /
 * payment ids ride hidden form fields; tenancy is enforced in the service (`assertSameGym` → 404),
 * never trusted from the client.
 */

const str = (form: FormData, key: string): string | undefined => {
  const v = form.get(key);
  return typeof v === "string" ? v : undefined;
};

export async function recordPaymentAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const membershipId = str(form, "membershipId") ?? "";
  const result = await recordPayment(principal, membershipId, {
    amount: str(form, "amount"),
    method: str(form, "method"),
    receivedOn: str(form, "receivedOn"),
    note: str(form, "note"),
  });
  if (result.status === "success") revalidatePath(`/memberships/${membershipId}`);
  return result;
}

export async function voidPaymentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  const membershipId = str(form, "membershipId") ?? "";
  const paymentId = str(form, "paymentId") ?? "";
  const result = await voidPayment(principal, paymentId, { voidReason: str(form, "voidReason") });
  if (result.status === "success") revalidatePath(`/memberships/${membershipId}`);
  return result;
}
