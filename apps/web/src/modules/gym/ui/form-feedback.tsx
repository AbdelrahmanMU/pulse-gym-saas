"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/pulse/alert";
import { useFormError } from "@/lib/i18n/form-error";
import type { ActionState } from "../service";

/** Shared initial state for every Gym Initialization form's `useActionState`. */
export const INITIAL_STATE: ActionState = { status: "idle" };

/**
 * Inline result surface: danger summary on validation error, success confirmation. The
 * error/validation bodies are produced English-source in the domain layer and localized on
 * the client via `useFormError` (mirrors the members/staff modules); the dynamic max-length
 * message falls back to English (documented Tier-2 residual).
 */
export function FormFeedback({
  state,
  successMessage,
}: {
  state: ActionState;
  successMessage?: string;
}) {
  const t = useTranslations("settings");
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

/** In onboarding mode, advance to the next step once the action succeeds. */
export function useStepRedirect(state: ActionState, nextHref?: string): void {
  const router = useRouter();
  useEffect(() => {
    if (state.status === "success" && nextHref) router.push(nextHref);
  }, [state, nextHref, router]);
}

/** The per-field Zod error, localized. Client hook (calls `useFormError`). */
export function useFieldError(): (state: ActionState, name: string) => string | undefined {
  const tr = useFormError();
  return (state, name) =>
    state.status === "error" ? tr(state.fieldErrors?.[name]?.[0]) : undefined;
}
