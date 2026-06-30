"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { FormLayout, FormSection, SubmitButton } from "@/components/pulse/form-layout";
import { Button } from "@/components/pulse/button";
import { formatMinorCurrency } from "@/lib/money";
import { createMembershipAction } from "../actions";
import type { MemberOption, PlanOption } from "../service";
import { fieldError, FormFeedback, INITIAL_STATE } from "./form-state";

/**
 * Sell-a-membership form (Catalog §9 composition). Selects an active member + an active plan
 * and an optional start date (defaults to today, judged in the gym time zone server-side). The
 * end date, duration, and price are **derived from the plan snapshot** server-side — never
 * entered here (MSH-1/MSH-2). Catalogued components + tokens only.
 */
export function MembershipForm({
  members,
  plans,
  defaultMemberId,
}: {
  members: MemberOption[];
  plans: PlanOption[];
  defaultMemberId?: string;
}) {
  const [state, formAction] = useActionState(createMembershipAction, INITIAL_STATE);

  const memberOptions: SelectOption[] = members.map((m) => ({ value: m.id, label: m.name }));
  const planOptions: SelectOption[] = plans.map((p) => ({
    value: p.id,
    label: `${p.name} — ${formatMinorCurrency(BigInt(p.priceMinor), p.currency)}`,
  }));

  return (
    <FormLayout
      action={formAction}
      actions={
        <>
          <Button asChild variant="secondary">
            <Link href="/memberships">Cancel</Link>
          </Button>
          <SubmitButton pendingLabel="Selling…">Sell membership</SubmitButton>
        </>
      }
    >
      <FormFeedback state={state} />

      <FormSection title="Membership" description="Who is buying, and which plan.">
        <FormField label="Member" required error={fieldError(state, "memberId")}>
          <SelectInput
            name="memberId"
            options={memberOptions}
            defaultValue={defaultMemberId ?? ""}
            placeholder="Select a member"
          />
        </FormField>
        <FormField label="Plan" required error={fieldError(state, "planId")}>
          <SelectInput name="planId" options={planOptions} placeholder="Select a plan" />
        </FormField>
        <FormField
          label="Start date"
          error={fieldError(state, "startDate")}
          help="Defaults to today if left blank."
        >
          <TextInput name="startDate" type="date" className="sm:w-52" />
        </FormField>
      </FormSection>
    </FormLayout>
  );
}
