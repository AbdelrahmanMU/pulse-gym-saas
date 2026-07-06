"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/pulse/alert";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { FormLayout, SubmitButton } from "@/components/pulse/form-layout";
import { signInAction, type SignInState } from "./actions";

const INITIAL: SignInState = { error: null };

/**
 * Credentials sign-in form — the T-19 form recomposed from the PULSE catalog
 * (Sprint 1.6). Pilot Readiness: ONE identifier field accepts a phone number or an
 * email (gym staff know people by phone first); the server resolves which it is, so
 * the field is plain text (`dir="ltr"` — phones/emails are LTR strings even in the
 * RTL UI, same as the member form). Same generic failure copy (no user-enumeration
 * hint). The Alert carries the failure (`role="alert"`); SubmitButton reflects the
 * pending state so double-submit stays impossible.
 */
export function SignInForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(signInAction, INITIAL);

  return (
    <FormLayout
      action={action}
      actions={
        <SubmitButton className="w-full" pendingLabel={t("pending")}>
          {t("submit")}
        </SubmitButton>
      }
    >
      {state.error ? <Alert severity="danger">{state.error}</Alert> : null}

      <div className="flex flex-col gap-4">
        <FormField label={t("identifier")} required>
          <TextInput
            name="identifier"
            dir="ltr"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </FormField>

        <FormField label={t("password")} required>
          <TextInput name="password" type="password" autoComplete="current-password" />
        </FormField>
      </div>
    </FormLayout>
  );
}
