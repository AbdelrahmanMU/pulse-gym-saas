"use client";

import { useActionState } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { SubmitButton } from "@/components/pulse/form-layout";
import { archivePlanAction, restorePlanAction } from "../actions";
import { FormFeedback, INITIAL_STATE } from "./form-state";

/**
 * Archive / restore controls for a plan (PLN-2 active⇄retired; gated by `plans.deactivate`,
 * which covers both directions). Archiving retires a plan (not sellable to new memberships,
 * existing ones unaffected — PLN-4); restoring reactivates it. Catalogued components + tokens
 * only.
 */
export function PlanLifecycleControls({ planId, isActive }: { planId: string; isActive: boolean }) {
  const [archiveState, archive] = useActionState(archivePlanAction, INITIAL_STATE);
  const [restoreState, restore] = useActionState(restorePlanAction, INITIAL_STATE);

  if (isActive) {
    return (
      <form action={archive} className="flex flex-col gap-2">
        <input type="hidden" name="planId" value={planId} />
        <FormFeedback state={archiveState} />
        <SubmitButton variant="outline" pendingLabel="Archiving…">
          <Archive aria-hidden className="size-4" />
          Archive plan
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={restore} className="flex flex-col gap-2">
      <input type="hidden" name="planId" value={planId} />
      <FormFeedback state={restoreState} />
      <SubmitButton variant="secondary" pendingLabel="Restoring…">
        <RotateCcw aria-hidden className="size-4" />
        Restore plan
      </SubmitButton>
    </form>
  );
}
