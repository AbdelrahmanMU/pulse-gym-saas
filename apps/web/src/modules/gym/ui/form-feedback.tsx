"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/pulse/alert";
import type { ActionState } from "../service";

/** Shared initial state for every Gym Initialization form's `useActionState`. */
export const INITIAL_STATE: ActionState = { status: "idle" };

/** Inline result surface: danger summary on validation error, success confirmation. */
export function FormFeedback({
  state,
  successMessage,
}: {
  state: ActionState;
  successMessage?: string;
}) {
  if (state.status === "error" && state.message) {
    return (
      <Alert severity="danger" title="Couldn’t save">
        {state.message}
      </Alert>
    );
  }
  if (state.status === "success" && successMessage) {
    return <Alert severity="success">{successMessage}</Alert>;
  }
  return null;
}

/** In onboarding mode, advance to the next step once the action succeeds. */
export function useStepRedirect(state: ActionState, nextHref?: string): void {
  const router = useRouter();
  useEffect(() => {
    if (state.status === "success" && nextHref) router.push(nextHref);
  }, [state, nextHref, router]);
}

/** First message for a field, if any (from Zod's flattened fieldErrors). */
export function fieldError(state: ActionState, name: string): string | undefined {
  return state.status === "error" ? state.fieldErrors?.[name]?.[0] : undefined;
}
