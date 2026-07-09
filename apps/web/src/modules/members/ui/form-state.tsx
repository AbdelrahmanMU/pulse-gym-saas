"use client";

import { useTranslations } from "next-intl";
import { Alert } from "@/components/pulse/alert";
import { useFormError } from "@/lib/i18n/form-error";
import type { ActionState } from "../service";

/**
 * Shared form-state glue for Member Management forms (mirrors the gym module's
 * form-feedback): the `useActionState` initial value, an inline result surface, and the
 * per-field error accessor for Zod's flattened `fieldErrors`. UI-only, no business logic.
 * Error/validation bodies (English-source, from the domain layer) are localized on the client
 * via `useFormError`; the composed archive-blocked sentence falls back to English (documented).
 */
export const INITIAL_STATE: ActionState = { status: "idle" };

export function FormFeedback({
  state,
  successMessage,
}: {
  state: ActionState;
  successMessage?: string;
}) {
  const t = useTranslations("members");
  const tr = useFormError();
  if (state.status === "error" && state.message) {
    return (
      <Alert severity="danger" title={t("formCouldntSave")}>
        {tr(state.message)}
      </Alert>
    );
  }
  if (state.status === "success" && successMessage) {
    return <Alert severity="success">{successMessage}</Alert>;
  }
  return null;
}

/** The per-field Zod error, localized. Client hook (calls `useFormError`). */
export function useFieldError(): (state: ActionState, name: string) => string | undefined {
  const tr = useFormError();
  return (state, name) =>
    state.status === "error" ? tr(state.fieldErrors?.[name]?.[0]) : undefined;
}

export function fieldError(state: ActionState, name: string): string | undefined {
  return state.status === "error" ? state.fieldErrors?.[name]?.[0] : undefined;
}
