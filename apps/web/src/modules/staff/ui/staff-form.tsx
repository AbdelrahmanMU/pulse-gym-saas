"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { SelectInput } from "@/components/pulse/select-input";
import { FormLayout, FormSection, SubmitButton } from "@/components/pulse/form-layout";
import { Button } from "@/components/pulse/button";
import type { ActionState, RoleOption, StaffDetail } from "../service";
import { fieldError, FormFeedback, INITIAL_STATE } from "./form-state";

/**
 * Staff create/edit form (Catalog §9 composition). `new` passes `roleOptions` and no `initial`
 * (collects identity, role, and a temporary password); `edit` passes the loaded staff + id and
 * shows only the editable profile (name + phone) — email is identity, and the role has its own
 * control on the detail page (roles.manage). The temporary password is owner-set (no email infra)
 * and never displayed back. Catalogued components + tokens only; FormField wires label/aria/error.
 */
type StaffFormAction = (state: ActionState, form: FormData) => Promise<ActionState>;

export function StaffForm({
  action,
  roleOptions,
  initial,
  gymUserId,
  submitLabel,
}: {
  action: StaffFormAction;
  roleOptions?: RoleOption[];
  initial?: StaffDetail;
  gymUserId?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_STATE);
  const isEdit = Boolean(initial);
  const t = useTranslations("staff");

  return (
    <FormLayout
      action={formAction}
      actions={
        <>
          <Button asChild variant="secondary">
            <Link href={gymUserId ? `/staff/${gymUserId}` : "/staff"}>{t("formCancel")}</Link>
          </Button>
          <SubmitButton pendingLabel={t("formPending")}>
            {submitLabel ?? t("formSave")}
          </SubmitButton>
        </>
      }
    >
      <FormFeedback state={state} />
      {gymUserId ? <input type="hidden" name="gymUserId" value={gymUserId} /> : null}

      <FormSection title={t("formSectionIdentity")} description={t("formSectionIdentityDesc")}>
        <FormField label={t("formFullName")} required error={fieldError(state, "displayName")}>
          <TextInput
            name="displayName"
            defaultValue={initial?.displayName ?? ""}
            autoComplete="name"
          />
        </FormField>
        {isEdit ? (
          <FormField label={t("formEmail")} help={t("formEmailHelp")}>
            <TextInput name="emailDisplay" defaultValue={initial?.email ?? ""} disabled />
          </FormField>
        ) : (
          <FormField label={t("formEmail")} required error={fieldError(state, "email")}>
            <TextInput name="email" type="email" autoComplete="off" />
          </FormField>
        )}
        <FormField label={t("formPhone")} error={fieldError(state, "phone")}>
          <TextInput
            name="phone"
            type="tel"
            defaultValue={initial?.phone ?? ""}
            autoComplete="tel"
          />
        </FormField>
      </FormSection>

      {isEdit ? null : (
        <FormSection title={t("formSectionRole")} description={t("formSectionRoleDesc")}>
          <FormField label={t("formRole")} required error={fieldError(state, "roleId")}>
            <SelectInput
              name="roleId"
              placeholder={t("formRolePlaceholder")}
              options={(roleOptions ?? []).map((r) => ({ value: r.id, label: r.name }))}
            />
          </FormField>
          <FormField
            label={t("formTempPassword")}
            required
            error={fieldError(state, "temporaryPassword")}
            help={t("formTempPasswordHelp")}
          >
            <TextInput name="temporaryPassword" type="password" autoComplete="new-password" />
          </FormField>
        </FormSection>
      )}
    </FormLayout>
  );
}
