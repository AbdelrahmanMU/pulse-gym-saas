import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  MembershipLifecycleControls,
  type LifecyclePermissions,
} from "@/modules/memberships/ui/membership-lifecycle-controls";
import { loadMembershipBilling } from "@/modules/payments/queries";
import type { MembershipBilling } from "@/modules/payments/service";
import { PaymentSummary } from "@/modules/payments/ui/payment-summary";
import { PaymentHistory } from "@/modules/payments/ui/payment-history";
import { RecordPaymentForm } from "@/modules/payments/ui/record-payment-form";

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

  const perms: LifecyclePermissions = {
    canRenew: hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_RENEW),
    canUpgrade: hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_UPGRADE),
    canFreeze: hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_FREEZE),
    canCancel: hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_CANCEL),
  };
  const showControls =
    membership.status !== MembershipStatus.CANCELLED &&
    (perms.canRenew || perms.canUpgrade || perms.canFreeze || perms.canCancel);
  // The upgrade picklist needs the gym's active plans — only loaded when upgrade is offered.
  const plans =
    perms.canUpgrade && membership.status === MembershipStatus.ACTIVE
      ? await loadSellablePlans()
      : [];

  // Billing is a separate concern (Epic-5): loaded through the payments module's public query,
  // gated by `payments.read`. Standing/balance are derived; payment activity never changes status.
  const canViewBilling = hasPermission(principal.permissions, PERMISSION_KEYS.PAYMENTS_READ);
  const canRecordPayment = hasPermission(principal.permissions, PERMISSION_KEYS.PAYMENTS_RECORD);
  const canVoidPayment = hasPermission(principal.permissions, PERMISSION_KEYS.PAYMENTS_VOID);
  const billing: MembershipBilling | null = canViewBilling
    ? await loadMembershipBilling(membershipId)
    : null;

  return (
    <PageContainer>
      <PageHeader
        title={membership.memberName}
        subtitle={membership.planName}
        actions={
          <Button asChild variant="secondary">
            <Link href={`/members/${membership.memberId}`}>View member</Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <MembershipStatusBadge
          status={membership.status}
          isExpiringSoon={membership.isExpiringSoon}
        />
        <span className="text-body-sm text-muted-foreground">
          {remainingDaysLabel(membership.status, membership.remainingDays)}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Plan (snapshot)">
          <Detail label="Plan">{membership.planName}</Detail>
          <Detail label="Price">
            <MetricValue
              value={membership.priceMinor}
              format="currency"
              currency={membership.currency}
            />
          </Detail>
          <Detail label="Duration">
            {formatDuration(membership.durationValue, membership.durationUnit)}
          </Detail>
        </Section>

        <Section title="Period">
          <Detail label="Start">
            <DateValue value={membership.startDate} />
          </Detail>
          <Detail label="Ends (inclusive)">
            <DateValue value={membership.effectiveEndDate} />
          </Detail>
          {membership.activeFreeze ? (
            <Detail label="Projected end on resume">
              <span className="text-muted-foreground">
                <DateValue value={membership.activeFreeze.projectedEndDate} />
                {" · estimate"}
              </span>
            </Detail>
          ) : null}
          {membership.scheduledEffectiveFrom ? (
            <Detail label="Scheduled to start">
              <DateValue value={membership.scheduledEffectiveFrom} />
            </Detail>
          ) : null}
          {membership.totalFrozenDays > 0 ? (
            <Detail label="Frozen days applied">{membership.totalFrozenDays}</Detail>
          ) : null}
          <Detail label="Responsible trainer">
            {membership.trainerName ?? <span className="text-muted-foreground">None</span>}
          </Detail>
          <MembershipPeriodNote
            status={membership.status}
            isRenewal={membership.predecessorMembershipId !== null}
            activeFreeze={membership.activeFreeze}
          />
        </Section>

        <Section title="Lifecycle timeline">
          <MembershipTimeline entries={membership.timeline} />
        </Section>

        {showControls ? (
          <Section title="Actions">
            <MembershipLifecycleControls
              membershipId={membership.id}
              status={membership.status}
              plans={plans}
              perms={perms}
            />
          </Section>
        ) : null}

        {billing ? (
          <>
            <Section title="Billing">
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
                    <span>Paid in full — no balance due.</span>
                  </div>
                ) : (
                  <div className="mt-2 border-t border-border pt-4">
                    <RecordPaymentForm membershipId={membership.id} currency={billing.currency} />
                  </div>
                )
              ) : null}
            </Section>

            <Section title="Payment history">
              <PaymentHistory
                membershipId={membership.id}
                entries={billing.history}
                canVoid={canVoidPayment}
              />
            </Section>
          </>
        ) : null}
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

function DateValue({ value }: { value: string }) {
  return (
    <time dateTime={value} className="tabular">
      {value}
    </time>
  );
}

function Forbidden() {
  return (
    <PageContainer>
      <ErrorState
        variant="inline"
        title="Access denied"
        description="You don't have permission to view this membership. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/memberships">Back to memberships</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
