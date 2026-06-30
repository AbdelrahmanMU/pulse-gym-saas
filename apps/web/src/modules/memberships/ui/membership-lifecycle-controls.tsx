"use client";

import { useActionState } from "react";
import { Ban, RefreshCw, Snowflake, TrendingUp, Play } from "lucide-react";
import type { MembershipStatus } from "@pulse/db";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { SubmitButton } from "@/components/pulse/form-layout";
import { formatMinorCurrency } from "@/lib/money";
import {
  cancelMembershipAction,
  freezeMembershipAction,
  renewMembershipAction,
  resumeMembershipAction,
  upgradeMembershipAction,
} from "../actions";
import type { PlanOption } from "../service";
import { fieldError, FormFeedback, INITIAL_STATE } from "./form-state";

/**
 * Membership lifecycle controls — the per-membership actions on the detail page, each shown
 * **by permission** and **by the membership's current derived status** (state-machines.md
 * allowed transitions). Renew/Upgrade/Freeze/Resume/Cancel are independent small forms so each
 * gets its own pending/feedback state. Catalogued components + tokens only.
 */
export interface LifecyclePermissions {
  canRenew: boolean;
  canUpgrade: boolean;
  canFreeze: boolean;
  canCancel: boolean;
}

export function MembershipLifecycleControls({
  membershipId,
  status,
  plans,
  perms,
}: {
  membershipId: string;
  status: MembershipStatus;
  plans: PlanOption[];
  perms: LifecyclePermissions;
}) {
  // Compare against the status string union (a value, not a role) — the enum *value* is not
  // imported here so this client component never bundles the server-only db package.
  const isActive = status === "ACTIVE";
  const isFrozen = status === "FROZEN";
  const isExpired = status === "EXPIRED";
  const canCancelNow = perms.canCancel && (isActive || isFrozen || status === "SCHEDULED");

  return (
    <div className="flex flex-col gap-5">
      {perms.canRenew && (isActive || isExpired) ? (
        <RenewControl membershipId={membershipId} />
      ) : null}
      {perms.canUpgrade && isActive ? (
        <UpgradeControl membershipId={membershipId} plans={plans} />
      ) : null}
      {perms.canFreeze && isActive ? <FreezeControl membershipId={membershipId} /> : null}
      {perms.canFreeze && isFrozen ? <ResumeControl membershipId={membershipId} /> : null}
      {canCancelNow ? <CancelControl membershipId={membershipId} /> : null}
    </div>
  );
}

function RenewControl({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(renewMembershipAction, INITIAL_STATE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormFeedback state={state} title="Couldn’t renew" />
      <SubmitButton variant="secondary" pendingLabel="Renewing…">
        <RefreshCw aria-hidden className="size-4" />
        Renew membership
      </SubmitButton>
      <p className="text-body-sm text-muted-foreground">
        Continues access into a new period — early renewal keeps remaining days (REN-1).
      </p>
    </form>
  );
}

function UpgradeControl({ membershipId, plans }: { membershipId: string; plans: PlanOption[] }) {
  const [state, action] = useActionState(upgradeMembershipAction, INITIAL_STATE);
  const options: SelectOption[] = plans.map((p) => ({
    value: p.id,
    label: `${p.name} — ${formatMinorCurrency(BigInt(p.priceMinor), p.currency)}`,
  }));
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormFeedback state={state} title="Couldn’t schedule the change" />
      <FormField label="Change to plan" error={fieldError(state, "planId")}>
        <SelectInput name="planId" options={options} placeholder="Select a plan" />
      </FormField>
      <SubmitButton variant="secondary" pendingLabel="Scheduling…">
        <TrendingUp aria-hidden className="size-4" />
        Schedule upgrade / downgrade
      </SubmitButton>
      <p className="text-body-sm text-muted-foreground">
        The current period runs unchanged; the new plan starts the day after it ends (UPG-1).
      </p>
    </form>
  );
}

function FreezeControl({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(freezeMembershipAction, INITIAL_STATE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormFeedback state={state} title="Couldn’t freeze" />
      <FormField label="Freeze for (days)" error={fieldError(state, "frozenDays")}>
        <TextInput name="frozenDays" type="number" inputMode="numeric" min={1} className="w-28" />
      </FormField>
      <SubmitButton variant="outline" pendingLabel="Freezing…">
        <Snowflake aria-hidden className="size-4" />
        Freeze membership
      </SubmitButton>
      <p className="text-body-sm text-muted-foreground">
        Pauses the clock; the end date extends by the frozen days on resume (FRZ-2).
      </p>
    </form>
  );
}

function ResumeControl({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(resumeMembershipAction, INITIAL_STATE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormFeedback state={state} title="Couldn’t resume" />
      <SubmitButton variant="secondary" pendingLabel="Resuming…">
        <Play aria-hidden className="size-4" />
        Resume membership
      </SubmitButton>
    </form>
  );
}

function CancelControl({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(cancelMembershipAction, INITIAL_STATE);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormFeedback state={state} title="Couldn’t cancel" />
      <SubmitButton variant="outline" pendingLabel="Cancelling…">
        <Ban aria-hidden className="size-4" />
        Cancel membership
      </SubmitButton>
      <p className="text-body-sm text-muted-foreground">
        Ends access immediately and can’t be undone — create a new membership instead (REN-4).
      </p>
    </form>
  );
}
