"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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

export function PlanForm({
  action,
  currency,
  initial,
  planId,
  submitLabel,
}: {
  action: PlanFormAction;
  currency: string;
  initial?: PlanDetail;
  planId?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const t = useTranslations("plans");

  const unitOptions: SelectOption[] = [
    { value: "DAY", label: t("unitDay") },
    { value: "WEEK", label: t("unitWeek") },
    { value: "MONTH", label: t("unitMonth") },
  ];

  return (
    <FormLayout
      action={formAction}
      actions={
        <>
          <Button asChild variant="secondary">
            <Link href={planId ? `/plans/${planId}` : "/plans"}>{t("formCancel")}</Link>
          </Button>
          <SubmitButton pendingLabel={t("formPending")}>
            {submitLabel ?? t("formSavePlan")}
          </SubmitButton>
        </>
      }
    >
      <FormFeedback state={state} />
      {planId ? <input type="hidden" name="planId" value={planId} /> : null}

      <FormSection title={t("formSectionPlan")} description={t("formSectionPlanDesc")}>
        <FormField label={t("formName")} required error={fieldError(state, "name")}>
          <TextInput name="name" defaultValue={initial?.name ?? ""} />
        </FormField>
        <FormField label={t("formDescription")} error={fieldError(state, "description")}>
          <TextArea name="description" defaultValue={initial?.description ?? ""} rows={3} />
        </FormField>
      </FormSection>

      <FormSection title={t("formSectionTerms")} description={t("formSectionTermsDesc")}>
        <FormField label={t("formDuration")} required error={fieldError(state, "durationValue")}>
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
              options={unitOptions}
              defaultValue={initial?.durationUnit ?? "MONTH"}
              aria-label={t("formDurationUnitAria")}
            />
          </div>
        </FormField>
        <FormField label={t("formPrice")} required error={fieldError(state, "price")}>
          <CurrencyInput name="price" currency={currency} defaultMinor={initial?.priceMinor} />
        </FormField>
      </FormSection>
    </FormLayout>
  );
}
