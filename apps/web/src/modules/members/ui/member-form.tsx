"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { FormLayout, FormSection, SubmitButton } from "@/components/pulse/form-layout";
import { Button } from "@/components/pulse/button";
import type { ActionState } from "../service";
import type { MemberDetail } from "../service";
import { useFieldError, FormFeedback, INITIAL_STATE } from "./form-state";

/**
 * Member create/edit form (Catalog §9 composition). One form for both flows: `new` passes
 * no `initial`; `edit` passes the loaded member + its id (a hidden field the action reads to
 * scope the update). Contact help text states the at-least-one rule (MBR-2/INV-9); the
 * server enforces it and contact uniqueness (INV-3) and returns field errors. Catalogued
 * components + tokens only; FormField guarantees label/aria/error wiring.
 */
type MemberFormAction = (state: ActionState, form: FormData) => Promise<ActionState>;

const dateValue = (d: Date | null | undefined): string => (d ? d.toISOString().slice(0, 10) : "");

export function MemberForm({
  action,
  initial,
  memberId,
  submitLabel = "Save member",
}: {
  action: MemberFormAction;
  initial?: MemberDetail;
  memberId?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const t = useTranslations("members");
  const fieldError = useFieldError();

  return (
    <FormLayout
      action={formAction}
      actions={
        <>
          <Button asChild variant="secondary">
            <Link href={memberId ? `/members/${memberId}` : "/members"}>{t("fmCancel")}</Link>
          </Button>
          <SubmitButton pendingLabel={t("fmSaving")}>
            {submitLabel ?? t("fmSaveMember")}
          </SubmitButton>
        </>
      }
    >
      <FormFeedback state={state} />
      {memberId ? <input type="hidden" name="memberId" value={memberId} /> : null}

      <FormSection title={t("fmSectionIdentity")} description={t("fmSectionIdentityDesc")}>
        <FormField label={t("fmFullName")} required error={fieldError(state, "fullName")}>
          <TextInput name="fullName" defaultValue={initial?.fullName ?? ""} autoComplete="name" />
        </FormField>
      </FormSection>

      <FormSection title={t("fmSectionContact")} description={t("fmSectionContactDesc")}>
        <FormField label={t("phone")} error={fieldError(state, "phone")}>
          <TextInput
            name="phone"
            type="tel"
            dir="ltr"
            defaultValue={initial?.phone ?? ""}
            autoComplete="tel"
          />
        </FormField>
        <FormField label={t("email")} error={fieldError(state, "email")}>
          <TextInput
            name="email"
            type="email"
            dir="ltr"
            defaultValue={initial?.email ?? ""}
            autoComplete="email"
          />
        </FormField>
      </FormSection>

      <FormSection title={t("fmSectionDetails")} description={t("fmSectionDetailsDesc")}>
        <FormField label={t("dob")} error={fieldError(state, "dateOfBirth")}>
          <TextInput
            name="dateOfBirth"
            type="date"
            defaultValue={dateValue(initial?.dateOfBirth)}
          />
        </FormField>
        <FormField label={t("gender")} error={fieldError(state, "gender")}>
          <TextInput name="gender" defaultValue={initial?.gender ?? ""} />
        </FormField>
        <FormField label={t("colJoined")} error={fieldError(state, "joinedOn")}>
          <TextInput name="joinedOn" type="date" defaultValue={dateValue(initial?.joinedOn)} />
        </FormField>
      </FormSection>
    </FormLayout>
  );
}
