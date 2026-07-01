"use client";

import { useActionState } from "react";
import { FormField } from "@/components/pulse/form-field";
import { SelectInput } from "@/components/pulse/select-input";
import { SubmitButton } from "@/components/pulse/form-layout";
import type { RoleOption } from "../service";
import { assignRoleAction } from "../actions";
import { fieldError, FormFeedback, INITIAL_STATE } from "./form-state";

/**
 * Role-assignment control for the staff detail page (gated by `roles.manage`). Sets `GymUser.roleId`
 * to an assignable catalog role — a permission bundle, never a role-name branch. An actor can't
 * change their own role (self-lockout guard, enforced in the service); the control is read-only for
 * the acting user. Catalogued components + tokens only.
 */
export function StaffRoleControl({
  gymUserId,
  currentRoleId,
  currentRoleName,
  roleOptions,
  isSelf,
}: {
  gymUserId: string;
  currentRoleId: string;
  currentRoleName: string;
  roleOptions: RoleOption[];
  isSelf: boolean;
}) {
  const [state, action] = useActionState(assignRoleAction, INITIAL_STATE);

  if (isSelf) {
    return (
      <p className="text-body text-foreground">
        {currentRoleName}
        <span className="ml-2 text-body-sm text-muted-foreground">
          (you can't change your own role)
        </span>
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="gymUserId" value={gymUserId} />
      <FormFeedback state={state} successMessage="Role updated." />
      <FormField label="Role" error={fieldError(state, "roleId")}>
        <SelectInput
          name="roleId"
          defaultValue={currentRoleId}
          options={roleOptions.map((r) => ({ value: r.id, label: r.name }))}
        />
      </FormField>
      <SubmitButton variant="secondary" pendingLabel="Updating…" className="self-start">
        Update role
      </SubmitButton>
    </form>
  );
}
