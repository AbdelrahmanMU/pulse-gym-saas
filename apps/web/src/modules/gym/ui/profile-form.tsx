"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { FormLayout, FormSection, SubmitButton } from "@/components/pulse/form-layout";
import { Avatar } from "@/components/pulse/avatar";
import { updateProfileAction } from "../actions";
import type { ProfileView } from "../service";
import { FormFeedback, INITIAL_STATE, useFieldError, useStepRedirect } from "./form-feedback";

/**
 * Owner (self) profile form (Catalog §9). Self-ownership: the action targets the session
 * user only — no target id (OQ-2). Email is read-only and password is absent (Phase-2
 * auth scope). Identity in the shell reflects on next sign-in (JWT principal). Used by the
 * settings page and the onboarding "Owner Profile" step.
 */
export function ProfileForm({ initial, nextHref }: { initial: ProfileView; nextHref?: string }) {
  const [state, action] = useActionState(updateProfileAction, INITIAL_STATE);
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
      <FormFeedback state={state} successMessage={nextHref ? undefined : t("profileSaved")} />

      <FormSection title={t("sectionPersonal")} description={t("sectionPersonalDesc")}>
        <div className="flex items-center gap-3">
          <Avatar name={initial.displayName} src={initial.avatarUrl ?? undefined} size="lg" />
          <span className="text-body-sm text-muted-foreground">{t("avatarPreview")}</span>
        </div>
        <FormField label={t("avatarUrl")} error={fieldError(state, "avatarUrl")}>
          <TextInput name="avatarUrl" type="url" defaultValue={initial.avatarUrl ?? ""} />
        </FormField>
        <FormField label={t("displayName")} required error={fieldError(state, "displayName")}>
          <TextInput name="displayName" defaultValue={initial.displayName} autoComplete="name" />
        </FormField>
        <FormField label={t("phone")} error={fieldError(state, "phone")}>
          <TextInput name="phone" defaultValue={initial.phone ?? ""} autoComplete="tel" />
        </FormField>
        <FormField label={t("email")} help={t("emailHelp")}>
          <TextInput name="email" defaultValue={initial.email} disabled readOnly />
        </FormField>
      </FormSection>
    </FormLayout>
  );
}
