"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FormField } from "@/components/pulse/form-field";
import { CurrencyInput } from "@/components/pulse/currency-input";
import { TextInput } from "@/components/pulse/text-input";
import { TextArea } from "@/components/pulse/text-area";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { SubmitButton } from "@/components/pulse/form-layout";
import { useFormError } from "@/lib/i18n/form-error";
import { PAYMENT_METHODS } from "../validation";
import { paymentMethodLabel } from "../format";
import { recordPaymentAction } from "../actions";
import { fieldError, FormFeedback, INITIAL_STATE } from "./form-state";

/**
 * Record-a-payment form — a small `useActionState` form on the membership detail page, shown only
 * with `payments.record`. The amount uses the catalogued CurrencyInput (the single money-entry
 * control; server is the parse authority). Currency is the membership snapshot currency, never
 * entered. Catalogued components + tokens only.
 */
export function RecordPaymentForm({
  membershipId,
  currency,
}: {
  membershipId: string;
  currency: string;
}) {
  const [state, action] = useActionState(recordPaymentAction, INITIAL_STATE);
  const t = useTranslations("payments");
  const ta = useTranslations("actions");
  const locale = useLocale();
  const tr = useFormError();
  const methodOptions: SelectOption[] = PAYMENT_METHODS.map((m) => ({
    value: m,
    label: paymentMethodLabel(m, locale),
  }));
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormFeedback state={state} title={t("rpErrTitle")} successMessage={t("rpSuccess")} />

      <FormField label={t("rpAmount")} error={tr(fieldError(state, "amount"))}>
        <CurrencyInput name="amount" currency={currency} />
      </FormField>

      <FormField label={t("rpMethod")} error={tr(fieldError(state, "method"))}>
        <SelectInput name="method" options={methodOptions} defaultValue="CASH" />
      </FormField>

      <FormField
        label={t("rpDate")}
        error={tr(fieldError(state, "receivedOn"))}
        help={t("rpDateHelp")}
      >
        <TextInput name="receivedOn" type="date" className="w-48" />
      </FormField>

      <FormField label={t("rpNote")} error={tr(fieldError(state, "note"))}>
        <TextArea name="note" rows={2} placeholder={t("rpNotePlaceholder")} />
      </FormField>

      <SubmitButton pendingLabel={t("rpPending")}>
        <Plus aria-hidden className="size-4" />
        {ta("recordPayment")}
      </SubmitButton>
    </form>
  );
}
