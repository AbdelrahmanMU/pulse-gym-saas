"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth/current-user";
import {
  dismissNotification,
  generateExpiryNotifications,
  markAllRead,
  markNotificationRead,
} from "./service";

/**
 * `"use server"` wrappers for Notifications (Sprint-1 Epic-7). Each resolves the current principal
 * (never trusts client-supplied identity/scope) and delegates to the testable {@link ./service} core,
 * then revalidates the notifications view. Tenancy + permission + the state-transition guard are
 * enforced in the service; the id rides a hidden form field. The transition actions return `void`
 * (form actions) — the guard makes an illegal write impossible server-side, and the UI never offers
 * an illegal transition (Dismissed rows are not listed), so there is no error state to surface here.
 */
const NOTIFICATIONS_PATH = "/notifications";

const str = (form: FormData, key: string): string | undefined => {
  const v = form.get(key);
  return typeof v === "string" ? v : undefined;
};

/**
 * The MVP generation trigger: invoked by the page's `GenerateOnOpen` client component on mount. This
 * is the *only* trigger today; the underlying {@link generateExpiryNotifications} is trigger-agnostic
 * and could later be driven by a scheduled job without change.
 */
export async function generateNotificationsAction(): Promise<void> {
  const principal = await currentUser.require();
  await generateExpiryNotifications(principal);
  revalidatePath(NOTIFICATIONS_PATH);
}

export async function markReadAction(form: FormData): Promise<void> {
  const principal = await currentUser.require();
  const id = str(form, "id");
  if (id) await markNotificationRead(principal, id);
  revalidatePath(NOTIFICATIONS_PATH);
}

export async function dismissAction(form: FormData): Promise<void> {
  const principal = await currentUser.require();
  const id = str(form, "id");
  if (id) await dismissNotification(principal, id);
  revalidatePath(NOTIFICATIONS_PATH);
}

export async function markAllReadAction(): Promise<void> {
  const principal = await currentUser.require();
  await markAllRead(principal);
  revalidatePath(NOTIFICATIONS_PATH);
}
