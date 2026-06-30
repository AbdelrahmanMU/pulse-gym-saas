"use client";

import { Alert } from "@/components/pulse/alert";
import type { ActionState } from "../service";

/**
 * Shared form-state glue for Member Management forms (mirrors the gym module's
 * form-feedback): the `useActionState` initial value, an inline result surface, and the
 * per-field error accessor for Zod's flattened `fieldErrors`. UI-only, no business logic.
 */
export const INITIAL_STATE: ActionState = { status: "idle" };

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

export function fieldError(state: ActionState, name: string): string | undefined {
  return state.status === "error" ? state.fieldErrors?.[name]?.[0] : undefined;
}
