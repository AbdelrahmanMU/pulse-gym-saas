"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { Checkbox } from "@/components/pulse/checkbox";
import { FormLayout, FormSection, SubmitButton } from "@/components/pulse/form-layout";
import { updateBranchAction } from "../actions";
import type { BranchView } from "../service";
import { FormFeedback, INITIAL_STATE, useFieldError, useStepRedirect } from "./form-feedback";

/**
 * Default-branch form (Catalog §9). Configures the single seeded branch (BRN-1 — no
 * "add branch" in MVP). `branchId` is a hidden field; the service enforces tenancy
 * (assertSameGym → 404). Used by the settings page and the onboarding "Branch Setup" step.
 */
export function BranchForm({ initial, nextHref }: { initial: BranchView; nextHref?: string }) {
  const [state, action] = useActionState(updateBranchAction, INITIAL_STATE);
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
      <input type="hidden" name="branchId" value={initial.id} />
      <FormFeedback state={state} successMessage={nextHref ? undefined : t("branchSaved")} />

      <FormSection title={t("sectionBranchDetails")} description={t("sectionBranchDetailsDesc")}>
        <FormField label={t("branchName")} required error={fieldError(state, "name")}>
          <TextInput name="name" defaultValue={initial.name} />
        </FormField>
        <FormField label={t("contactPhone")} error={fieldError(state, "contactPhone")}>
          <TextInput name="contactPhone" defaultValue={initial.contactPhone ?? ""} />
        </FormField>
        <Checkbox name="isActive" label={t("branchActive")} defaultChecked={initial.isActive} />
      </FormSection>

      <FormSection title={t("sectionAddress")} description={t("sectionAddressDesc")}>
        <FormField label={t("addressLine1")} error={fieldError(state, "line1")}>
          <TextInput
            name="line1"
            defaultValue={initial.address.line1 ?? ""}
            autoComplete="address-line1"
          />
        </FormField>
        <FormField label={t("addressLine2")} error={fieldError(state, "line2")}>
          <TextInput
            name="line2"
            defaultValue={initial.address.line2 ?? ""}
            autoComplete="address-line2"
          />
        </FormField>
        <FormField label={t("city")} error={fieldError(state, "city")}>
          <TextInput
            name="city"
            defaultValue={initial.address.city ?? ""}
            autoComplete="address-level2"
          />
        </FormField>
        <FormField label={t("region")} error={fieldError(state, "region")}>
          <TextInput
            name="region"
            defaultValue={initial.address.region ?? ""}
            autoComplete="address-level1"
          />
        </FormField>
        <FormField label={t("postalCode")} error={fieldError(state, "postalCode")}>
          <TextInput
            name="postalCode"
            defaultValue={initial.address.postalCode ?? ""}
            autoComplete="postal-code"
          />
        </FormField>
        <FormField label={t("country")} error={fieldError(state, "country")}>
          <TextInput
            name="country"
            defaultValue={initial.address.country ?? ""}
            autoComplete="country-name"
          />
        </FormField>
      </FormSection>
    </FormLayout>
  );
}
