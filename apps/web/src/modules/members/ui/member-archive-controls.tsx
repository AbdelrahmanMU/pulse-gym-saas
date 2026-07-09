"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Archive, RotateCcw } from "lucide-react";
import { SubmitButton } from "@/components/pulse/form-layout";
import { archiveMemberAction, reactivateMemberAction } from "../actions";
import { FormFeedback, INITIAL_STATE } from "./form-state";

/**
 * Archive / reactivate controls for the member profile (ARC-1/2; gated by `members.archive`
 * / `members.reactivate`). Archiving removes a member from active lists while retaining
 * history; reactivation restores them. Reactivation can fail if another active member now
 * holds this contact (INV-3, partial-unique) — the service returns that as an inline error.
 * Catalogued components + tokens only.
 */
export function MemberArchiveControls({
  memberId,
  status,
  canArchive,
  canReactivate,
}: {
  memberId: string;
  status: "ACTIVE" | "ARCHIVED";
  canArchive: boolean;
  canReactivate: boolean;
}) {
  const [archiveState, archive] = useActionState(archiveMemberAction, INITIAL_STATE);
  const [reactivateState, reactivate] = useActionState(reactivateMemberAction, INITIAL_STATE);
  const t = useTranslations("members");

  if (status === "ACTIVE") {
    if (!canArchive) return null;
    return (
      <form action={archive} className="flex flex-col gap-2">
        <input type="hidden" name="memberId" value={memberId} />
        <FormFeedback state={archiveState} />
        <SubmitButton variant="outline" pendingLabel={t("archivePending")}>
          <Archive aria-hidden className="size-4" />
          {t("archiveButton")}
        </SubmitButton>
      </form>
    );
  }

  if (!canReactivate) return null;
  return (
    <form action={reactivate} className="flex flex-col gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <FormFeedback state={reactivateState} />
      <SubmitButton variant="secondary" pendingLabel={t("reactivatePending")}>
        <RotateCcw aria-hidden className="size-4" />
        {t("reactivateButton")}
      </SubmitButton>
    </form>
  );
}
