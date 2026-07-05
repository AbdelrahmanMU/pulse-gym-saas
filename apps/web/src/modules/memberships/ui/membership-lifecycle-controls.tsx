"use client";

import { useActionState } from "react";
import { Ban, RefreshCw, Snowflake, TrendingUp, Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
  const t = useTranslations("memberships");
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormFeedback state={state} title={t("lcRenewErr")} />
      <SubmitButton variant="secondary" pendingLabel={t("lcRenewPending")}>
        <RefreshCw aria-hidden className="size-4" />
        {t("lcRenewButton")}
      </SubmitButton>
      <p className="text-body-sm text-muted-foreground">{t("lcRenewHelp")}</p>
    </form>
  );
}

function UpgradeControl({ membershipId, plans }: { membershipId: string; plans: PlanOption[] }) {
  const [state, action] = useActionState(upgradeMembershipAction, INITIAL_STATE);
  const t = useTranslations("memberships");
  const locale = useLocale();
  const options: SelectOption[] = plans.map((p) => ({
    value: p.id,
    label: t("planPriceOption", {
      name: p.name,
      price: formatMinorCurrency(BigInt(p.priceMinor), p.currency, locale),
    }),
  }));
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormFeedback state={state} title={t("lcUpgradeErr")} />
      <FormField label={t("lcUpgradeChangeTo")} error={fieldError(state, "planId")}>
        <SelectInput name="planId" options={options} placeholder={t("lcUpgradeSelectPlan")} />
      </FormField>
      <SubmitButton variant="secondary" pendingLabel={t("lcUpgradePending")}>
        <TrendingUp aria-hidden className="size-4" />
        {t("lcUpgradeButton")}
      </SubmitButton>
      <p className="text-body-sm text-muted-foreground">{t("lcUpgradeHelp")}</p>
    </form>
  );
}

function FreezeControl({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(freezeMembershipAction, INITIAL_STATE);
  const t = useTranslations("memberships");
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormFeedback state={state} title={t("lcFreezeErr")} />
      <FormField label={t("lcFreezeLabel")} error={fieldError(state, "frozenDays")}>
        <TextInput name="frozenDays" type="number" inputMode="numeric" min={1} className="w-28" />
      </FormField>
      <SubmitButton variant="outline" pendingLabel={t("lcFreezePending")}>
        <Snowflake aria-hidden className="size-4" />
        {t("lcFreezeButton")}
      </SubmitButton>
      <p className="text-body-sm text-muted-foreground">{t("lcFreezeHelp")}</p>
    </form>
  );
}

function ResumeControl({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(resumeMembershipAction, INITIAL_STATE);
  const t = useTranslations("memberships");
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormFeedback state={state} title={t("lcResumeErr")} />
      <SubmitButton variant="secondary" pendingLabel={t("lcResumePending")}>
        <Play aria-hidden className="size-4" />
        {t("lcResumeButton")}
      </SubmitButton>
    </form>
  );
}

function CancelControl({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(cancelMembershipAction, INITIAL_STATE);
  const t = useTranslations("memberships");
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormFeedback state={state} title={t("lcCancelErr")} />
      <SubmitButton variant="outline" pendingLabel={t("lcCancelPending")}>
        <Ban aria-hidden className="size-4" />
        {t("lcCancelButton")}
      </SubmitButton>
      <p className="text-body-sm text-muted-foreground">{t("lcCancelHelp")}</p>
    </form>
  );
}
