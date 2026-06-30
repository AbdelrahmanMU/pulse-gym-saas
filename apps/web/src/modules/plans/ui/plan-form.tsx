"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { TextArea } from "@/components/pulse/text-area";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { CurrencyInput } from "@/components/pulse/currency-input";
import { FormLayout, FormSection, SubmitButton } from "@/components/pulse/form-layout";
import { Button } from "@/components/pulse/button";
import type { ActionState, PlanDetail } from "../service";
import { fieldError, FormFeedback, INITIAL_STATE } from "./form-state";

/**
 * Plan create/edit form (Catalog §9 composition). One form for both flows: `new` passes the
 * gym currency only; `edit` passes the loaded plan + its id (a hidden field the action reads
 * to scope the update). Price uses the catalogued CurrencyInput (money never a float); the
 * server is the single parse authority. Catalogued components + tokens only.
 */
type PlanFormAction = (state: ActionState, form: FormData) => Promise<ActionState>;

const UNIT_OPTIONS: SelectOption[] = [
  { value: "DAY", label: "Day(s)" },
  { value: "WEEK", label: "Week(s)" },
  { value: "MONTH", label: "Month(s)" },
];

export function PlanForm({
  action,
  currency,
  initial,
  planId,
  submitLabel = "Save plan",
}: {
  action: PlanFormAction;
  currency: string;
  initial?: PlanDetail;
  planId?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_STATE);

  return (
    <FormLayout
      action={formAction}
      actions={
        <>
          <Button asChild variant="secondary">
            <Link href={planId ? `/plans/${planId}` : "/plans"}>Cancel</Link>
          </Button>
          <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        </>
      }
    >
      <FormFeedback state={state} />
      {planId ? <input type="hidden" name="planId" value={planId} /> : null}

      <FormSection title="Plan" description="What members are buying.">
        <FormField label="Name" required error={fieldError(state, "name")}>
          <TextInput name="name" defaultValue={initial?.name ?? ""} />
        </FormField>
        <FormField label="Description" error={fieldError(state, "description")}>
          <TextArea name="description" defaultValue={initial?.description ?? ""} rows={3} />
        </FormField>
      </FormSection>

      <FormSection title="Terms" description="Duration and price (in your gym's currency).">
        <FormField label="Duration" required error={fieldError(state, "durationValue")}>
          <div className="flex gap-2">
            <TextInput
              name="durationValue"
              type="number"
              inputMode="numeric"
              min={1}
              defaultValue={initial?.durationValue ?? 1}
              className="w-24"
            />
            <SelectInput
              name="durationUnit"
              options={UNIT_OPTIONS}
              defaultValue={initial?.durationUnit ?? "MONTH"}
              aria-label="Duration unit"
            />
          </div>
        </FormField>
        <FormField label="Price" required error={fieldError(state, "price")}>
          <CurrencyInput name="price" currency={currency} defaultMinor={initial?.priceMinor} />
        </FormField>
      </FormSection>
    </FormLayout>
  );
}
