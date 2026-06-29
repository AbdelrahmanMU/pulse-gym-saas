"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "./actions";

const INITIAL: SignInState = { error: null };

/**
 * Minimal credentials sign-in form (T-19). Deliberately unstyled — the design system
 * and Catalog components arrive in Session 4 (T-12…T-14). Its only job is to exercise
 * the sign-in path. The generic error message carries no enumeration hint.
 */
export function SignInForm() {
  const [state, action, pending] = useActionState(signInAction, INITIAL);

  return (
    <form action={action}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="username" required />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      {state.error ? (
        <p role="alert" aria-live="polite">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
