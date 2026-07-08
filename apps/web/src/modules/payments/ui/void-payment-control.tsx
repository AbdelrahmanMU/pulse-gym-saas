"use client";

import { useActionState } from "react";
import { Ban } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { SubmitButton } from "@/components/pulse/form-layout";
import { useFormError } from "@/lib/i18n/form-error";
import { useFullNavigationOnSuccess } from "@/lib/forms/use-full-navigation-on-success";
import { voidPaymentAction } from "../actions";
import { fieldError, FormFeedback, INITIAL_STATE } from "./form-state";

/**
 * Void-a-payment control — a per-row `useActionState` form on the payment history, shown only with
 * `payments.void` for a payment that is still voidable. Mirrors the membership Cancel/Freeze
 * controls (an inline form + outline SubmitButton + a one-line warning) — no bespoke disclosure
 * pattern. Voiding never edits/deletes; it appends an immutable VOID entry (handled server-side).
 * An optional reason is captured for the record. Catalogued components + tokens only.
 */
export function VoidPaymentControl({
  membershipId,
  paymentId,
}: {
  membershipId: string;
  paymentId: string;
}) {
  const [state, action] = useActionState(voidPaymentAction, INITIAL_STATE);
  // Success reloads this page fresh (see the note in ../actions.ts — never re-render in place).
  useFullNavigationOnSuccess(state, () => window.location.pathname);
  const t = useTranslations("payments");
  const tr = useFormError();
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <input type="hidden" name="paymentId" value={paymentId} />
      <FormFeedback state={state} title={t("vpErrTitle")} />
      <FormField label={t("vpReason")} error={tr(fieldError(state, "voidReason"))}>
        <TextInput name="voidReason" placeholder={t("vpReasonPlaceholder")} className="w-full" />
      </FormField>
      <SubmitButton variant="outline" pendingLabel={t("vpPending")}>
        <Ban aria-hidden className="size-4" />
        {t("vpButton")}
      </SubmitButton>
      <p className="text-body-sm text-muted-foreground">{t("vpHelp")}</p>
    </form>
  );
}
