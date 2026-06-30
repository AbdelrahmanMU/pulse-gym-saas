"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import {
  completeOnboarding,
  updateDefaultBranch,
  updateGymSettings,
  updateMyProfile,
  type ActionState,
} from "./service";

/**
 * "use server" wrappers for Gym Initialization (Sprint-1 Epic-1). Each resolves the
 * current principal (never trusts client-supplied identity/scope) and delegates to the
 * testable {@link ./service} core, then revalidates affected paths. Shaped for
 * `useActionState` — returns an {@link ActionState}; typed auth/tenancy errors thrown by
 * the service propagate to the route error boundary (rare; the UI gates by permission).
 */

const str = (form: FormData, key: string): string | undefined => {
  const v = form.get(key);
  return typeof v === "string" ? v : undefined;
};

export async function updateGymSettingsAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const result = await updateGymSettings(principal, {
    name: str(form, "name"),
    contactEmail: str(form, "contactEmail"),
    contactPhone: str(form, "contactPhone"),
    defaultCurrency: str(form, "defaultCurrency"),
    timeZone: str(form, "timeZone"),
    expiringSoonWindowDays: str(form, "expiringSoonWindowDays"),
    gracePeriodDays: str(form, "gracePeriodDays"),
  });
  if (result.status === "success") revalidatePath("/settings/gym");
  return result;
}

export async function updateBranchAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const principal = await currentUser.require();
  // branchId is a hidden field; tenancy is enforced in the service (assertSameGym → 404).
  const branchId = str(form, "branchId") ?? principal.branchId;
  const result = await updateDefaultBranch(principal, branchId, {
    name: str(form, "name"),
    contactPhone: str(form, "contactPhone"),
    isActive: str(form, "isActive"),
    address: {
      line1: str(form, "line1"),
      line2: str(form, "line2"),
      city: str(form, "city"),
      region: str(form, "region"),
      postalCode: str(form, "postalCode"),
      country: str(form, "country"),
    },
  });
  if (result.status === "success") revalidatePath("/settings/branch");
  return result;
}

export async function updateProfileAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const principal = await currentUser.require();
  const result = await updateMyProfile(principal, {
    displayName: str(form, "displayName"),
    phone: str(form, "phone"),
    avatarUrl: str(form, "avatarUrl"),
  });
  if (result.status === "success") {
    // Identity in the shell rides the JWT principal (Session-3 strategy) → it reflects on
    // next sign-in; revalidate the rendered profile page now.
    revalidatePath("/settings/profile");
  }
  return result;
}

/** Onboarding terminal step: mark setup complete, then land on the dashboard. */
export async function finishOnboardingAction(): Promise<void> {
  const principal = await currentUser.require();
  await completeOnboarding(principal);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
