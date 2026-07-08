"use client";

import { useActionState } from "react";
import { Ban, RefreshCw, Snowflake, TrendingUp, Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { SelectInput, type SelectOption } from "@/components/pulse/select-input";
import { SubmitButton } from "@/components/pulse/form-layout";
import { formatMinorCurrency } from "@/lib/money";
import { useFullNavigationOnSuccess } from "@/lib/forms/use-full-navigation-on-success";
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
 *
 * Two hard-won constraints guard these forms against a production-only deadlock where a
 * successful action left the button stuck on its pending label forever (reproduced on Next
 * 15.5 and 16.2; dev builds unaffected — Performance Recovery sprint):
 * 1. Each control is exported individually and composed directly by the server page — never
 *    re-wrapped in a shared client component whose props change with the membership status.
 * 2. Success leaves via {@link useFullNavigationOnSuccess} (the actions return plain results
 *    and never revalidate/redirect in place — see the note in `../actions.ts`).
 */

/** Success target: the successor membership's detail page (renew/upgrade create one). */
const toSuccessor = (s: { status: string }): string => {
  const id = (s as { membershipId?: string }).membershipId;
  return id ? `/memberships/${id}` : window.location.pathname;
};

/** Success target: this page, reloaded fresh (freeze/resume/cancel change it in place). */
const reloadHere = (): string => window.location.pathname;

export function RenewControl({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(renewMembershipAction, INITIAL_STATE);
  useFullNavigationOnSuccess(state, toSuccessor);
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

export function UpgradeControl({
  membershipId,
  plans,
}: {
  membershipId: string;
  plans: PlanOption[];
}) {
  const [state, action] = useActionState(upgradeMembershipAction, INITIAL_STATE);
  useFullNavigationOnSuccess(state, toSuccessor);
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

export function FreezeControl({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(freezeMembershipAction, INITIAL_STATE);
  useFullNavigationOnSuccess(state, reloadHere);
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

export function ResumeControl({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(resumeMembershipAction, INITIAL_STATE);
  useFullNavigationOnSuccess(state, reloadHere);
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

export function CancelControl({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(cancelMembershipAction, INITIAL_STATE);
  useFullNavigationOnSuccess(state, reloadHere);
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
