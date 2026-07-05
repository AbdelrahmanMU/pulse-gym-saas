"use client";

import { useTranslations } from "next-intl";
import { Alert } from "@/components/pulse/alert";
import { useFormError } from "@/lib/i18n/form-error";
import type { ActionState } from "../service";

/**
 * Shared form-state glue for Payments forms (mirrors the memberships/plans modules): the
 * `useActionState` initial value, an inline result surface, and the per-field error accessor for
 * Zod's flattened `fieldErrors`. Error bodies render via `useFormError` (localizes the known
 * static messages; the currency-composed amount error falls back to English — a Tier-2 residual).
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
  const t = useTranslations("payments");
  const tr = useFormError();
  if (state.status === "error" && state.message) {
    return (
      <Alert severity="danger" title={title ?? t("formCouldntSave")}>
        {tr(state.message)}
      </Alert>
    );
  }
  if (state.status === "success" && successMessage) {
    return <Alert severity="success">{successMessage}</Alert>;
  }
  return null;
}

/** The raw field error (English source); wrap with `useFormError()` at the call site to localize. */
export function fieldError(state: ActionState, name: string): string | undefined {
  return state.status === "error" ? state.fieldErrors?.[name]?.[0] : undefined;
}
