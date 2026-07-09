"use server";

import { authenticationAdapter } from "@/lib/auth/authentication-adapter";

/**
 * Sign-out server action (T-19). Delegates to the Authentication Adapter (which
 * invalidates the session and redirects to sign-in) — domain/route code never calls
 * Auth.js directly.
 */
export async function signOutAction(): Promise<void> {
  await authenticationAdapter.signOut();
}
