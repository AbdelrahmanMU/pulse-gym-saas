"use server";

import { currentUser } from "@/lib/auth/current-user";
import { recordPayment, voidPayment, type ActionState } from "./service";

/**
 * `"use server"` wrappers for Payments (Sprint-1 Epic-5). Each resolves the current principal
 * (never trusts client-supplied identity/scope) and delegates to the testable {@link ./service}
 * core. Shaped for `useActionState`. The membership / payment ids ride hidden form fields;
 * tenancy is enforced in the service (`assertSameGym` → 404), never trusted from the client.
 *
 * Post-success freshness: PLAIN results — no `revalidatePath`, no `redirect`. The submitting
 * forms perform a full-document navigation on success (`useFullNavigationOnSuccess`), which
 * re-renders everything server-fresh and resets the client router cache. An in-place success
 * response intermittently deadlocks React's pending form state in production builds — see the
 * note in modules/memberships/actions.ts (Performance Recovery sprint).
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
  return recordPayment(principal, membershipId, {
    amount: str(form, "amount"),
    method: str(form, "method"),
    receivedOn: str(form, "receivedOn"),
    note: str(form, "note"),
  });
}

export async function voidPaymentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  const paymentId = str(form, "paymentId") ?? "";
  return voidPayment(principal, paymentId, { voidReason: str(form, "voidReason") });
}
