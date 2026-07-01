"use client";

import { useActionState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { SubmitButton } from "@/components/pulse/form-layout";
import type { StaffStatus } from "../service";
import { reactivateStaffAction, suspendStaffAction } from "../actions";
import { FormFeedback, INITIAL_STATE } from "./form-state";

/**
 * Suspend / reactivate controls for the staff detail page (gated by `staff.manage`). Suspend sets
 * the schema status `REVOKED` (displayed "Suspended") — the reversible deactivation that also blocks
 * sign-in. The consequence is **surfaced**, not silent: suspending a responsible trainer unassigns
 * them from their members (INV-36), and that is not restored on reactivation. Self-suspension is
 * blocked in the service (self-lockout guard); the control is hidden for the acting user. Catalogued
 * components + tokens only.
 */
export function StaffStatusControls({
  gymUserId,
  status,
  isSelf,
}: {
  gymUserId: string;
  status: StaffStatus;
  isSelf: boolean;
}) {
  const [suspendState, suspend] = useActionState(suspendStaffAction, INITIAL_STATE);
  const [reactivateState, reactivate] = useActionState(reactivateStaffAction, INITIAL_STATE);

  if (isSelf) {
    return (
      <p className="text-body-sm text-muted-foreground">You can't suspend your own account.</p>
    );
  }

  if (status === "ACTIVE") {
    return (
      <form action={suspend} className="flex flex-col gap-2">
        <input type="hidden" name="gymUserId" value={gymUserId} />
        <FormFeedback state={suspendState} />
        <p className="text-body-sm text-muted-foreground">
          Suspending blocks sign-in and unassigns this person from any members they coach. This
          isn't restored automatically on reactivation.
        </p>
        <SubmitButton variant="outline" pendingLabel="Suspending…">
          <Ban aria-hidden className="size-4" />
          Suspend staff
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={reactivate} className="flex flex-col gap-2">
      <input type="hidden" name="gymUserId" value={gymUserId} />
      <FormFeedback state={reactivateState} />
      <SubmitButton variant="secondary" pendingLabel="Reactivating…">
        <RotateCcw aria-hidden className="size-4" />
        Reactivate staff
      </SubmitButton>
    </form>
  );
}
