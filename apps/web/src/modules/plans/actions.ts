"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { archivePlan, createPlan, restorePlan, updatePlan, type ActionState } from "./service";

/**
 * `"use server"` wrappers for Plan Management (Sprint-1 Epic-3). Each resolves the current
 * principal (never trusts client-supplied identity/scope), delegates to the testable
 * {@link ./service} core, then revalidates affected paths. Shaped for `useActionState`. The
 * plan id rides a hidden form field; tenancy is enforced in the service (`assertSameGym` →
 * 404), never trusted.
 */

const str = (form: FormData, key: string): string | undefined => {
  const v = form.get(key);
  return typeof v === "string" ? v : undefined;
};

const planFields = (form: FormData) => ({
  name: str(form, "name"),
  description: str(form, "description"),
  durationValue: str(form, "durationValue"),
  durationUnit: str(form, "durationUnit"),
  price: str(form, "price"),
});

export async function createPlanAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  const result = await createPlan(principal, planFields(form));
  if (result.status === "success" && result.planId) {
    revalidatePath("/plans");
    redirect(`/plans/${result.planId}`);
  }
  return result;
}

export async function updatePlanAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  const planId = str(form, "planId") ?? "";
  const result = await updatePlan(principal, planId, planFields(form));
  if (result.status === "success") {
    revalidatePath("/plans");
    revalidatePath(`/plans/${planId}`);
    redirect(`/plans/${planId}`);
  }
  return result;
}

export async function archivePlanAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  const planId = str(form, "planId") ?? "";
  const result = await archivePlan(principal, planId);
  if (result.status === "success") revalidatePlan(planId);
  return result;
}

export async function restorePlanAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  const planId = str(form, "planId") ?? "";
  const result = await restorePlan(principal, planId);
  if (result.status === "success") revalidatePlan(planId);
  return result;
}

function revalidatePlan(planId: string): void {
  revalidatePath("/plans");
  revalidatePath(`/plans/${planId}`);
}
