"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { FormLayout, FormSection, SubmitButton } from "@/components/pulse/form-layout";
import { updateGymSettingsAction } from "../actions";
import type { GymSettingsView } from "../service";
import { FormFeedback, INITIAL_STATE, useFieldError, useStepRedirect } from "./form-feedback";

/**
 * Gym settings form (Catalog §9 composition). Used by both the persistent settings page
 * and the onboarding "Gym Setup" step (pass `nextHref` to advance on success). Identity +
 * operational settings on one `Gym` entity → one save (`gym.manage`). Tokens/components
 * only; FormField guarantees label/aria/error wiring.
 */
export function GymSettingsForm({
  initial,
  currencyOptions,
  timeZoneOptions,
  nextHref,
}: {
  initial: GymSettingsView;
  currencyOptions: SelectOption[];
  timeZoneOptions: SelectOption[];
  nextHref?: string;
}) {
  const [state, action] = useActionState(updateGymSettingsAction, INITIAL_STATE);
  const t = useTranslations("settings");
  const fieldError = useFieldError();
  useStepRedirect(state, nextHref);

  return (
    <FormLayout
      action={action}
      actions={
        <SubmitButton pendingLabel={t("saving")}>
          {nextHref ? t("saveAndContinue") : t("saveChanges")}
        </SubmitButton>
      }
    >
      <FormFeedback state={state} successMessage={nextHref ? undefined : t("gymSaved")} />

      <FormSection title={t("sectionIdentity")} description={t("sectionIdentityDesc")}>
        <FormField label={t("gymName")} required error={fieldError(state, "name")}>
          <TextInput name="name" defaultValue={initial.name} autoComplete="organization" />
        </FormField>
        <FormField label={t("contactEmail")} error={fieldError(state, "contactEmail")}>
          <TextInput name="contactEmail" type="email" defaultValue={initial.contactEmail ?? ""} />
        </FormField>
        <FormField label={t("contactPhone")} error={fieldError(state, "contactPhone")}>
          <TextInput name="contactPhone" defaultValue={initial.contactPhone ?? ""} />
        </FormField>
      </FormSection>

      <FormSection title={t("sectionLocalization")} description={t("sectionLocalizationDesc")}>
        <FormField
          label={t("defaultCurrency")}
          required
          error={fieldError(state, "defaultCurrency")}
        >
          <SelectInput
            name="defaultCurrency"
            defaultValue={initial.defaultCurrency}
            options={currencyOptions}
          />
        </FormField>
        <FormField label={t("timeZone")} required error={fieldError(state, "timeZone")}>
          <SelectInput name="timeZone" defaultValue={initial.timeZone} options={timeZoneOptions} />
        </FormField>
        <FormField
          label={t("expiringWindow")}
          required
          help={t("expiringWindowHelp")}
          error={fieldError(state, "expiringSoonWindowDays")}
        >
          <TextInput
            name="expiringSoonWindowDays"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={initial.expiringSoonWindowDays}
          />
        </FormField>
        <FormField label={t("gracePeriod")} required error={fieldError(state, "gracePeriodDays")}>
          <TextInput
            name="gracePeriodDays"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={initial.gracePeriodDays}
          />
        </FormField>
      </FormSection>
    </FormLayout>
  );
}
