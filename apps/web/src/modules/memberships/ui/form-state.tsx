"use client";

import { useTranslations } from "next-intl";
import { Alert } from "@/components/pulse/alert";
import type { ActionState } from "../service";

/**
 * Shared form-state glue for Membership Lifecycle forms (mirrors the plans/members modules):
 * the `useActionState` initial value, an inline result surface, and the per-field error
 * accessor for Zod's flattened `fieldErrors`. UI-only, no business logic.
 */
export const INITIAL_STATE: ActionState = { status: "idle" };

export function FormFeedback({
  state,
  successMessage,
  title,
}: {
  state: ActionState;
  successMessage?: string;
  title?: string;
}) {
  const t = useTranslations("memberships");
  if (state.status === "error" && state.message) {
    return (
      <Alert severity="danger" title={title ?? t("formCouldntSave")}>
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
