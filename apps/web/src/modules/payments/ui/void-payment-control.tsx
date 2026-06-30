"use client";

import { useActionState } from "react";
import { Ban } from "lucide-react";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { SubmitButton } from "@/components/pulse/form-layout";
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
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <input type="hidden" name="paymentId" value={paymentId} />
      <FormFeedback state={state} title="Couldn’t void" />
      <FormField label="Void reason (optional)" error={fieldError(state, "voidReason")}>
        <TextInput name="voidReason" placeholder="e.g. Entered twice" className="w-full" />
      </FormField>
      <SubmitButton variant="outline" pendingLabel="Voiding…">
        <Ban aria-hidden className="size-4" />
        Void payment
      </SubmitButton>
      <p className="text-body-sm text-muted-foreground">
        Records an immutable reversal — the original payment is kept, never deleted (PAY).
      </p>
    </form>
  );
}
