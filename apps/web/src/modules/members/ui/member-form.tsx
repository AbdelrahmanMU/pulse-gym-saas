"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { FormLayout, FormSection, SubmitButton } from "@/components/pulse/form-layout";
import { Button } from "@/components/pulse/button";
import type { ActionState } from "../service";
import type { MemberDetail } from "../service";
import { fieldError, FormFeedback, INITIAL_STATE } from "./form-state";

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

  return (
    <FormLayout
      action={formAction}
      actions={
        <>
          <Button asChild variant="secondary">
            <Link href={memberId ? `/members/${memberId}` : "/members"}>Cancel</Link>
          </Button>
          <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        </>
      }
    >
      <FormFeedback state={state} />
      {memberId ? <input type="hidden" name="memberId" value={memberId} /> : null}

      <FormSection title="Identity" description="Who this member is.">
        <FormField label="Full name" required error={fieldError(state, "fullName")}>
          <TextInput name="fullName" defaultValue={initial?.fullName ?? ""} autoComplete="name" />
        </FormField>
      </FormSection>

      <FormSection
        title="Contact"
        description="A member needs at least one way to be reached — a phone number or an email."
      >
        <FormField label="Phone" error={fieldError(state, "phone")}>
          <TextInput
            name="phone"
            type="tel"
            defaultValue={initial?.phone ?? ""}
            autoComplete="tel"
          />
        </FormField>
        <FormField label="Email" error={fieldError(state, "email")}>
          <TextInput
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
            autoComplete="email"
          />
        </FormField>
      </FormSection>

      <FormSection title="Details" description="Optional personal details.">
        <FormField label="Date of birth" error={fieldError(state, "dateOfBirth")}>
          <TextInput
            name="dateOfBirth"
            type="date"
            defaultValue={dateValue(initial?.dateOfBirth)}
          />
        </FormField>
        <FormField label="Gender" error={fieldError(state, "gender")}>
          <TextInput name="gender" defaultValue={initial?.gender ?? ""} />
        </FormField>
        <FormField label="Joined on" error={fieldError(state, "joinedOn")}>
          <TextInput name="joinedOn" type="date" defaultValue={dateValue(initial?.joinedOn)} />
        </FormField>
      </FormSection>
    </FormLayout>
  );
}
