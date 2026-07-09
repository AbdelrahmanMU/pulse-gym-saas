"use client";

import { useActionState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("staff");

  if (isSelf) {
    return <p className="text-body-sm text-muted-foreground">{t("scSelfNote")}</p>;
  }

  if (status === "ACTIVE") {
    return (
      <form action={suspend} className="flex flex-col gap-2">
        <input type="hidden" name="gymUserId" value={gymUserId} />
        <FormFeedback state={suspendState} />
        <p className="text-body-sm text-muted-foreground">{t("scSuspendNote")}</p>
        <SubmitButton variant="outline" pendingLabel={t("scSuspendPending")}>
          <Ban aria-hidden className="size-4" />
          {t("scSuspendButton")}
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={reactivate} className="flex flex-col gap-2">
      <input type="hidden" name="gymUserId" value={gymUserId} />
      <FormFeedback state={reactivateState} />
      <SubmitButton variant="secondary" pendingLabel={t("scReactivatePending")}>
        <RotateCcw aria-hidden className="size-4" />
        {t("scReactivateButton")}
      </SubmitButton>
    </form>
  );
}
