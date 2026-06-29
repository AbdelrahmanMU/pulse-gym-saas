import { AuthError } from "next-auth";
import { signIn } from "./auth";

/**
 * Attempt a credentials sign-in, confined to the adapter boundary so the route-level
 * server action never imports `next-auth`. Returns `true` on success (the session
 * cookie is set), `false` on invalid credentials. Unexpected (non-auth) errors
 * propagate — they are not swallowed as "invalid credentials".
 *
 * `redirect: false` keeps the redirect decision in the caller (the server action),
 * and avoids signIn throwing a `NEXT_REDIRECT` we'd have to special-case here.
 */
export async function attemptSignIn(email: string, password: string): Promise<boolean> {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return true;
  } catch (error) {
    if (error instanceof AuthError) return false;
    throw error;
  }
}
