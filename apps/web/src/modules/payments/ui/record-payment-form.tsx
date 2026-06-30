"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { FormField } from "@/components/pulse/form-field";
import { CurrencyInput } from "@/components/pulse/currency-input";
import { TextInput } from "@/components/pulse/text-input";
import { TextArea } from "@/components/pulse/text-area";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { SubmitButton } from "@/components/pulse/form-layout";
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
const METHOD_OPTIONS: SelectOption[] = PAYMENT_METHODS.map((m) => ({
  value: m,
  label: paymentMethodLabel(m),
}));

export function RecordPaymentForm({
  membershipId,
  currency,
}: {
  membershipId: string;
  currency: string;
}) {
  const [state, action] = useActionState(recordPaymentAction, INITIAL_STATE);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormFeedback
        state={state}
        title="Couldn’t record the payment"
        successMessage="Payment recorded."
      />

      <FormField label="Amount" error={fieldError(state, "amount")}>
        <CurrencyInput name="amount" currency={currency} />
      </FormField>

      <FormField label="Method" error={fieldError(state, "method")}>
        <SelectInput name="method" options={METHOD_OPTIONS} defaultValue="CASH" />
      </FormField>

      <FormField
        label="Payment date"
        error={fieldError(state, "receivedOn")}
        help="Defaults to today if left blank."
      >
        <TextInput name="receivedOn" type="date" className="w-48" />
      </FormField>

      <FormField label="Note (optional)" error={fieldError(state, "note")}>
        <TextArea name="note" rows={2} placeholder="e.g. Paid in cash at the front desk" />
      </FormField>

      <SubmitButton pendingLabel="Recording…">
        <Plus aria-hidden className="size-4" />
        Record payment
      </SubmitButton>
    </form>
  );
}
