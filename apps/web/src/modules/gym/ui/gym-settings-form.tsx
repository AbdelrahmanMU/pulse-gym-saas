"use client";

import { useActionState } from "react";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { FormLayout, FormSection, SubmitButton } from "@/components/pulse/form-layout";
import { updateGymSettingsAction } from "../actions";
import type { GymSettingsView } from "../service";
import { fieldError, FormFeedback, INITIAL_STATE, useStepRedirect } from "./form-feedback";

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
  submitLabel = "Save changes",
}: {
  initial: GymSettingsView;
  currencyOptions: SelectOption[];
  timeZoneOptions: SelectOption[];
  nextHref?: string;
  submitLabel?: string;
}) {
  const [state, action] = useActionState(updateGymSettingsAction, INITIAL_STATE);
  useStepRedirect(state, nextHref);

  return (
    <FormLayout
      action={action}
      actions={
        nextHref ? (
          <SubmitButton pendingLabel="Saving…">Save &amp; continue</SubmitButton>
        ) : (
          <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        )
      }
    >
      <FormFeedback state={state} successMessage={nextHref ? undefined : "Gym settings saved."} />

      <FormSection title="Identity & contact" description="How your gym appears across the app.">
        <FormField label="Gym name" required error={fieldError(state, "name")}>
          <TextInput name="name" defaultValue={initial.name} autoComplete="organization" />
        </FormField>
        <FormField label="Contact email" error={fieldError(state, "contactEmail")}>
          <TextInput name="contactEmail" type="email" defaultValue={initial.contactEmail ?? ""} />
        </FormField>
        <FormField label="Contact phone" error={fieldError(state, "contactPhone")}>
          <TextInput name="contactPhone" defaultValue={initial.contactPhone ?? ""} />
        </FormField>
      </FormSection>

      <FormSection
        title="Localization & operations"
        description="Currency and time zone drive all money and dates across the system."
      >
        <FormField label="Default currency" required error={fieldError(state, "defaultCurrency")}>
          <SelectInput
            name="defaultCurrency"
            defaultValue={initial.defaultCurrency}
            options={currencyOptions}
          />
        </FormField>
        <FormField label="Time zone" required error={fieldError(state, "timeZone")}>
          <SelectInput name="timeZone" defaultValue={initial.timeZone} options={timeZoneOptions} />
        </FormField>
        <FormField
          label="Expiring-soon window (days)"
          required
          help="Members are flagged this many days before their membership ends."
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
        <FormField
          label="Grace period (days)"
          required
          error={fieldError(state, "gracePeriodDays")}
        >
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
