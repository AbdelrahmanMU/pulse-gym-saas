"use client";

import { useActionState } from "react";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { FormLayout, FormSection, SubmitButton } from "@/components/pulse/form-layout";
import { Avatar } from "@/components/pulse/avatar";
import { updateProfileAction } from "../actions";
import type { ProfileView } from "../service";
import { fieldError, FormFeedback, INITIAL_STATE, useStepRedirect } from "./form-feedback";

/**
 * Owner (self) profile form (Catalog §9). Self-ownership: the action targets the session
 * user only — no target id (OQ-2). Email is read-only and password is absent (Phase-2
 * auth scope). Identity in the shell reflects on next sign-in (JWT principal). Used by the
 * settings page and the onboarding "Owner Profile" step.
 */
export function ProfileForm({ initial, nextHref }: { initial: ProfileView; nextHref?: string }) {
  const [state, action] = useActionState(updateProfileAction, INITIAL_STATE);
  useStepRedirect(state, nextHref);

  return (
    <FormLayout
      action={action}
      actions={
        <SubmitButton pendingLabel="Saving…">
          {nextHref ? "Save & continue" : "Save changes"}
        </SubmitButton>
      }
    >
      <FormFeedback
        state={state}
        successMessage={
          nextHref
            ? undefined
            : "Profile saved. Your name updates across the app next time you sign in."
        }
      />

      <FormSection title="Personal" description="How you appear to your team.">
        <div className="flex items-center gap-3">
          <Avatar name={initial.displayName} src={initial.avatarUrl ?? undefined} size="lg" />
          <span className="text-body-sm text-muted-foreground">Preview</span>
        </div>
        <FormField label="Avatar URL" error={fieldError(state, "avatarUrl")}>
          <TextInput name="avatarUrl" type="url" defaultValue={initial.avatarUrl ?? ""} />
        </FormField>
        <FormField label="Display name" required error={fieldError(state, "displayName")}>
          <TextInput name="displayName" defaultValue={initial.displayName} autoComplete="name" />
        </FormField>
        <FormField label="Phone" error={fieldError(state, "phone")}>
          <TextInput name="phone" defaultValue={initial.phone ?? ""} autoComplete="tel" />
        </FormField>
        <FormField
          label="Email"
          help="Email and password are managed in account security (coming later)."
        >
          <TextInput name="email" defaultValue={initial.email} disabled readOnly />
        </FormField>
      </FormSection>
    </FormLayout>
  );
}
