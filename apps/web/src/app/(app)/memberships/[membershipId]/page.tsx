import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CircleCheck } from "lucide-react";
import { MembershipStatus, PaymentStanding } from "@pulse/db";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { MetricValue } from "@/components/pulse/metric-value";
import { loadMembership, loadSellablePlans } from "@/modules/memberships/queries";
import type { MembershipDetail } from "@/modules/memberships/service";
import { formatDuration } from "@/modules/plans/format";
import { remainingDaysLabel } from "@/modules/memberships/format";
import { MembershipStatusBadge } from "@/modules/memberships/ui/membership-status-badge";
import { MembershipPeriodNote } from "@/modules/memberships/ui/membership-period-note";
import { MembershipTimeline } from "@/modules/memberships/ui/membership-timeline";
import {
  CancelControl,
  FreezeControl,
  RenewControl,
  ResumeControl,
  UpgradeControl,
} from "@/modules/memberships/ui/membership-lifecycle-controls";
import { loadMembershipBilling } from "@/modules/payments/queries";
import type { MembershipBilling } from "@/modules/payments/service";
import { PaymentSummary } from "@/modules/payments/ui/payment-summary";
import { PaymentHistory } from "@/modules/payments/ui/payment-history";
import { RecordPaymentForm } from "@/modules/payments/ui/record-payment-form";
import { formatDate, toISODate } from "@/lib/format-date";

/**
 * Membership detail (Sprint-1 Epic-4). Gated by `memberships.read`. Shows the member, the
 * **plan snapshot** (never the live plan), derived status / remaining days (gym tz), the
 * responsible trainer (read-only), and the lifecycle timeline. Hosts the lifecycle controls —
 * each shown **by permission and current status**. A cross-gym/unknown id surfaces as 404.
 */
export default async function MembershipDetailPage({
  params,
}: {
  params: Promise<{ membershipId: string }>;
}) {
  let principal;
  try {
    principal = await requirePermission(PERMISSION_KEYS.MEMBERSHIPS_READ);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const { membershipId } = await params;
  let membership: MembershipDetail;
  try {
    membership = await loadMembership(membershipId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const perms = {
    canRenew: hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_RENEW),
    canUpgrade: hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_UPGRADE),
    canFreeze: hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_FREEZE),
    canCancel: hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_CANCEL),
  };
  // Which lifecycle controls the actor sees — by permission AND allowed transition
  // (state-machines.md). Composed HERE at the server boundary: each control hosts its own
  // `useActionState`, and wrapping them in a client component whose props change with the
  // membership status deadlocks the pending form in production (see the note in
  // membership-lifecycle-controls.tsx).
  const isActive = membership.status === MembershipStatus.ACTIVE;
  const isFrozen = membership.status === MembershipStatus.FROZEN;
  const showRenew = perms.canRenew && (isActive || membership.status === MembershipStatus.EXPIRED);
  const showUpgrade = perms.canUpgrade && isActive;
  const showFreeze = perms.canFreeze && isActive;
  const showResume = perms.canFreeze && isFrozen;
  const showCancel =
    perms.canCancel && (isActive || isFrozen || membership.status === MembershipStatus.SCHEDULED);
  const showControls = showRenew || showUpgrade || showFreeze || showResume || showCancel;
  // Billing is a separate concern (Epic-5): loaded through the payments module's public query,
  // gated by `payments.read`. Standing/balance are derived; payment activity never changes status.
  const canViewBilling = hasPermission(principal.permissions, PERMISSION_KEYS.PAYMENTS_READ);
  const canRecordPayment = hasPermission(principal.permissions, PERMISSION_KEYS.PAYMENTS_RECORD);
  const canVoidPayment = hasPermission(principal.permissions, PERMISSION_KEYS.PAYMENTS_VOID);

  // Independent reads — the upgrade picklist (gym's active plans, only when upgrade is
  // offered), billing, and translations don't depend on each other; fetch concurrently
  // (Performance Recovery, Task 4).
  const [plans, billing, t, locale] = await Promise.all([
    showUpgrade ? loadSellablePlans() : Promise.resolve([]),
    canViewBilling
      ? loadMembershipBilling(membershipId)
      : Promise.resolve<MembershipBilling | null>(null),
    getTranslations("memberships"),
    getLocale(),
  ]);
  const remaining = remainingDaysLabel(membership.status, membership.remainingDays);

  return (
    <PageContainer>
      <PageHeader
        title={membership.memberName}
        subtitle={membership.planName}
        actions={
          <Button asChild variant="secondary">
            <Link href={`/members/${membership.memberId}`}>{t("detailViewMember")}</Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <MembershipStatusBadge
          status={membership.status}
          isExpiringSoon={membership.isExpiringSoon}
        />
        <span className="text-body-sm text-muted-foreground">
          {t(remaining.key, remaining.values)}
        </span>
      </div>

      {/* Section order is operational-first (v1.2 §6 / AP-5, DD-9): P0 money (Billing) →
          next action (lifecycle Actions) → P1 period/plan facts → P2 history/audit. One DOM
          order serves both presentations — mobile stacks it top-to-bottom; the desktop
          2-column grid leads with Billing + Actions (reading order = DOM order, §5.11). */}
      <div className="grid gap-6 md:grid-cols-2">
        {billing ? (
          <Section title={t("sectionBilling")}>
            <PaymentSummary billing={billing} />
            {canRecordPayment ? (
              // Payment is always *permitted* server-side (recordPayment is status-independent);
              // once nothing is owed (standing PAID — covers exact and overpaid/credit) we retire
              // the action to a passive confirmation so full-paid memberships don't invite a
              // needless payment. Purely presentational: a later void re-derives standing away
              // from PAID and the form returns on the next render.
              billing.standing === PaymentStanding.PAID ? (
                <div className="mt-2 flex items-center gap-2 border-t border-border pt-4 text-body-sm text-muted-foreground">
                  <CircleCheck aria-hidden className="size-4 text-success-text" />
                  <span>{t("detailPaidInFull")}</span>
                </div>
              ) : (
                <div className="mt-2 border-t border-border pt-4">
                  <RecordPaymentForm membershipId={membership.id} currency={billing.currency} />
                </div>
              )
            ) : null}
          </Section>
        ) : null}

        {showControls ? (
          <Section title={t("sectionActions")}>
            <div className="flex flex-col gap-5">
              {showRenew ? <RenewControl membershipId={membership.id} /> : null}
              {showUpgrade ? <UpgradeControl membershipId={membership.id} plans={plans} /> : null}
              {showFreeze ? <FreezeControl membershipId={membership.id} /> : null}
              {showResume ? <ResumeControl membershipId={membership.id} /> : null}
              {showCancel ? <CancelControl membershipId={membership.id} /> : null}
            </div>
          </Section>
        ) : null}

        <Section title={t("sectionPeriod")}>
          <Detail label={t("detailStart")}>
            <DateValue value={membership.startDate} locale={locale} />
          </Detail>
          <Detail label={t("detailEndsInclusive")}>
            <DateValue value={membership.effectiveEndDate} locale={locale} />
          </Detail>
          {membership.activeFreeze ? (
            <Detail label={t("detailProjectedEnd")}>
              <span className="text-muted-foreground">
                <DateValue value={membership.activeFreeze.projectedEndDate} locale={locale} />
                {t("detailEstimateSuffix")}
              </span>
            </Detail>
          ) : null}
          {membership.scheduledEffectiveFrom ? (
            <Detail label={t("detailScheduledStart")}>
              <DateValue value={membership.scheduledEffectiveFrom} locale={locale} />
            </Detail>
          ) : null}
          {membership.totalFrozenDays > 0 ? (
            <Detail label={t("detailFrozenDays")}>{membership.totalFrozenDays}</Detail>
          ) : null}
          <Detail label={t("detailTrainer")}>
            {membership.trainerName ?? (
              <span className="text-muted-foreground">{t("detailTrainerNone")}</span>
            )}
          </Detail>
          <MembershipPeriodNote
            status={membership.status}
            isRenewal={membership.predecessorMembershipId !== null}
            activeFreeze={membership.activeFreeze}
          />
        </Section>

        <Section title={t("sectionPlanSnapshot")}>
          <Detail label={t("detailPlan")}>{membership.planName}</Detail>
          <Detail label={t("detailPrice")}>
            <MetricValue
              value={membership.priceMinor}
              format="currency"
              currency={membership.currency}
            />
          </Detail>
          <Detail label={t("detailDuration")}>
            {formatDuration(membership.durationValue, membership.durationUnit, locale)}
          </Detail>
        </Section>

        {billing ? (
          <Section title={t("sectionPaymentHistory")}>
            <PaymentHistory
              membershipId={membership.id}
              entries={billing.history}
              canVoid={canVoidPayment}
            />
          </Section>
        ) : null}

        <Section title={t("sectionTimeline")}>
          <MembershipTimeline entries={membership.timeline} />
        </Section>
      </div>
    </PageContainer>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6">
      <h2 className="text-h3 text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <span className="text-body text-foreground">{children}</span>
    </div>
  );
}

function DateValue({ value, locale }: { value: string; locale: string }) {
  return (
    <time dateTime={toISODate(value)} className="tabular">
      {formatDate(value, locale, "full")}
    </time>
  );
}

async function Forbidden() {
  const t = await getTranslations("errors");
  return (
    <PageContainer>
      <ErrorState
        variant="inline"
        title={t("accessDenied")}
        description={t("forbiddenBody")}
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">{t("backToDashboard")}</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
