"use client";

import { useActionState } from "react";
import { FormField } from "@/components/pulse/form-field";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { SubmitButton } from "@/components/pulse/form-layout";
import { Button } from "@/components/pulse/button";
import { assignTrainerAction, unassignTrainerAction } from "../actions";
import type { TrainerOption } from "../service";
import { fieldError, FormFeedback, INITIAL_STATE } from "./form-state";

/**
 * Assign / reassign / unassign a member's responsible trainer (ASN-1; gated by
 * `assignments.manage`). The picklist is the gym's active staff (ASN-2 — informational, not
 * role-gated). Assign and unassign are two small forms so each gets its own pending/feedback
 * state. Catalogued components + tokens only.
 */
export function AssignTrainerForm({
  memberId,
  currentTrainerGymUserId,
  options,
}: {
  memberId: string;
  currentTrainerGymUserId: string | null;
  options: TrainerOption[];
}) {
  const [assignState, assign] = useActionState(assignTrainerAction, INITIAL_STATE);
  const [unassignState, unassign] = useActionState(unassignTrainerAction, INITIAL_STATE);

  const selectOptions: SelectOption[] = options.map((o) => ({ value: o.gymUserId, label: o.name }));

  return (
    <div className="flex flex-col gap-3">
      <form action={assign} className="flex flex-col gap-3">
        <input type="hidden" name="memberId" value={memberId} />
        <FormField label="Responsible trainer" error={fieldError(assignState, "trainerGymUserId")}>
          <SelectInput
            name="trainerGymUserId"
            options={selectOptions}
            defaultValue={currentTrainerGymUserId ?? ""}
            placeholder="Select a staff member"
          />
        </FormField>
        <FormFeedback state={assignState} successMessage="Trainer updated." />
        <div className="flex items-center gap-2">
          <SubmitButton variant="secondary" pendingLabel="Saving…">
            Save trainer
          </SubmitButton>
        </div>
      </form>

      {currentTrainerGymUserId ? (
        <form action={unassign}>
          <input type="hidden" name="memberId" value={memberId} />
          <FormFeedback state={unassignState} successMessage="Trainer removed." />
          <Button type="submit" variant="ghost" size="sm">
            Remove trainer
          </Button>
        </form>
      ) : null}
    </div>
  );
}
