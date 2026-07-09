import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  CircleCheck,
  CircleOff,
  Pencil,
  Plus,
  Snowflake,
  TriangleAlert,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { formatDate, toISODate } from "@/lib/format-date";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { AnswerStrip } from "@/components/pulse/answer-strip";
import { Disclosure } from "@/components/pulse/disclosure";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { StatusBadge } from "@/components/pulse/status-badge";
import { MetricValue } from "@/components/pulse/metric-value";
import { StickyMobileActionBar } from "@/components/pulse/sticky-mobile-action-bar";
import { loadAssignableTrainers, loadMember } from "@/modules/members/queries";
import {
  loadMemberMembershipStanding,
  loadMemberMembershipTimeline,
} from "@/modules/memberships/queries";
import type { MemberMembershipStanding, MemberMembershipTimeline } from "@/modules/memberships";
import { MembershipRail } from "@/modules/memberships/ui/membership-rail";
import {
  loadMemberOutstandingBalance,
  loadMemberPaymentSummaries,
} from "@/modules/payments/queries";
import type {
  MemberOutstandingBalance,
  MembershipPaymentSummary,
} from "@/modules/payments/service";
import type { MemberDetail, TrainerOption } from "@/modules/members/service";
import { MemberStatusBadge } from "@/modules/members/ui/member-status-badge";
import { MemberOverflowMenu } from "@/modules/members/ui/member-overflow-menu";
import { AssignTrainerForm } from "@/modules/members/ui/assign-trainer-form";
import { MemberArchiveControls } from "@/modules/members/ui/member-archive-controls";

/**
 * Member Workspace (design authority 2026-07-03; W1 shell + W2 rail). Zone 1: the AnswerStrip
 * (identity · coverage · money · one computed action). Zone 2: the Membership rail — every
 * immutable membership as an expandable card over the A-1 timeline read + the per-membership
 * payments summaries. Zone 3: Member info as a folded Disclosure (phone + trainer promoted
 * into the fold header). Gated by `members.read`; every other zone/line by its owning module's
 * permission, composed through public reads only. A cross-gym or unknown id surfaces as 404.
 * Routing only — data + mutations live in the modules (constitution §2).
 *
 * Strip grain note: the coverage line and the strip primary still compute from the boolean
 * standing read (W1 shape); the full L2 grammar and precedence rules 1/3/4 (§D6.2) are the
 * actions phase — the only computable primary here remains Sell membership (rule 2).
 */
interface WorkspacePermissions {
  canUpdate: boolean;
  canArchive: boolean;
  canReactivate: boolean;
  canReadAssignments: boolean;
  canManageAssignments: boolean;
  canReadMemberships: boolean;
  canReadPayments: boolean;
  canCreateMembership: boolean;
}

function workspacePermissions(permissions: readonly string[]): WorkspacePermissions {
  return {
    canUpdate: hasPermission(permissions, PERMISSION_KEYS.MEMBERS_UPDATE),
    canArchive: hasPermission(permissions, PERMISSION_KEYS.MEMBERS_ARCHIVE),
    canReactivate: hasPermission(permissions, PERMISSION_KEYS.MEMBERS_REACTIVATE),
    canReadAssignments: hasPermission(permissions, PERMISSION_KEYS.ASSIGNMENTS_READ),
    canManageAssignments: hasPermission(permissions, PERMISSION_KEYS.ASSIGNMENTS_MANAGE),
    canReadMemberships: hasPermission(permissions, PERMISSION_KEYS.MEMBERSHIPS_READ),
    canReadPayments: hasPermission(permissions, PERMISSION_KEYS.PAYMENTS_READ),
    canCreateMembership: hasPermission(permissions, PERMISSION_KEYS.MEMBERSHIPS_CREATE),
  };
}

export default async function MemberWorkspacePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  let principal;
  try {
    principal = await requirePermission(PERMISSION_KEYS.MEMBERS_READ);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const { memberId } = await params;
  let member: MemberDetail;
  try {
    member = await loadMember(memberId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const perms = workspacePermissions(principal.permissions);
  const [standing, owed, timeline, paymentSummaries, trainerOptions] = await Promise.all([
    perms.canReadMemberships
      ? loadMemberMembershipStanding(member.id)
      : Promise.resolve<MemberMembershipStanding | null>(null),
    perms.canReadPayments
      ? loadMemberOutstandingBalance(member.id)
      : Promise.resolve<MemberOutstandingBalance | null>(null),
    perms.canReadMemberships
      ? loadMemberMembershipTimeline(member.id)
      : Promise.resolve<MemberMembershipTimeline | null>(null),
    perms.canReadPayments
      ? loadMemberPaymentSummaries(member.id)
      : Promise.resolve<MembershipPaymentSummary[] | null>(null),
    perms.canManageAssignments ? loadAssignableTrainers() : Promise.resolve<TrainerOption[]>([]),
  ]);

  const hasLiveOrQueued =
    standing !== null &&
    (standing.hasActiveMembership ||
      standing.hasFrozenMembership ||
      standing.hasScheduledMembership);
  // §D6.2 rule 2 — the one W1-computable primary. Selling requires a provable "no live or
  // queued membership" (standing read available), an ACTIVE member, and the permission.
  const showSell =
    standing !== null &&
    !hasLiveOrQueued &&
    member.status === "ACTIVE" &&
    perms.canCreateMembership;
  const sellHref = `/memberships/new?memberId=${member.id}`;
  const t = await getTranslations("members");
  const tActions = await getTranslations("actions");

  const sellButton = (
    <Button asChild>
      <Link href={sellHref}>
        <Plus aria-hidden className="size-4" />
        {tActions("sellMembership")}
      </Link>
    </Button>
  );

  return (
    <PageContainer>
      <AnswerStrip
        identity={<IdentityLine member={member} canUpdate={perms.canUpdate} />}
        coverage={standing ? <MembershipStandingChips standing={standing} /> : undefined}
        money={owed ? <MoneyLine owed={owed} /> : undefined}
        action={showSell ? sellButton : undefined}
      />

      {/* Zones 2 + 3 — one DOM order (strip → membership → member info); the ≥lg grid only
          places the folded card beside the rail zone (authority §D12). */}
      {/* grid-cols-1 = minmax(0,1fr): nowrap fold-header content must never widen the track. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {timeline ? (
          <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6 lg:col-span-7">
            <h2 className="text-h3 text-foreground">{t("railHeading")}</h2>
            <MembershipRail
              timeline={timeline}
              summaries={paymentSummaries}
              sellAction={showSell ? sellButton : undefined}
            />
          </section>
        ) : null}
        <MemberInfoCard member={member} perms={perms} trainerOptions={trainerOptions} />
      </div>

      {showSell || perms.canUpdate ? (
        // Thumb-zone mirror of the strip primary + Edit (one-sticky rule §D3.3, <md only).
        <StickyMobileActionBar className="mt-6 md:hidden">
          {perms.canUpdate ? (
            <Button asChild variant="secondary">
              <Link href={`/members/${member.id}/edit`}>
                <Pencil aria-hidden className="size-4" />
                {t("editShort")}
              </Link>
            </Button>
          ) : null}
          {showSell ? sellButton : null}
        </StickyMobileActionBar>
      ) : null}
    </PageContainer>
  );
}

/** Strip L1 — the page `<h1>` + member badge, trainer/tenure meta, and the Edit overflow. */
function IdentityLine({ member, canUpdate }: { member: MemberDetail; canUpdate: boolean }) {
  const t = useTranslations("members");
  const locale = useLocale();
  return (
    <PageHeader
      className="mb-0"
      title={member.fullName}
      titleAccessory={<MemberStatusBadge status={member.status} withNoun />}
      subtitle={
        <span className="text-body-sm">
          {member.trainerName ? (
            <>
              {t("colTrainer")}{" "}
              <span className="text-foreground" dir="auto">
                {member.trainerName}
              </span>
              {" · "}
            </>
          ) : null}
          {member.joinedOn ? (
            <>
              {t("wsSince")}{" "}
              <time dateTime={toISODate(member.joinedOn)}>
                {formatDate(member.joinedOn, locale, "monthYear")}
              </time>
            </>
          ) : null}
        </span>
      }
      actions={canUpdate ? <MemberOverflowMenu memberId={member.id} /> : undefined}
    />
  );
}

/**
 * The W1 coverage line: the membership-standing cues (icon + label + `*-text` token — never
 * color alone), booleans only. The full frozen L2 grammar (`<plan> · <STATUS> · <boundary>`,
 * §D10) replaces these chips in W2 when the member-scoped timeline read (A-1) exists.
 */
function MembershipStandingChips({ standing }: { standing: MemberMembershipStanding }) {
  const t = useTranslations("members");
  const none =
    !standing.hasActiveMembership &&
    !standing.hasScheduledMembership &&
    !standing.hasFrozenMembership;
  return (
    <span className="flex flex-wrap items-center gap-2">
      {standing.hasActiveMembership ? (
        <StatusBadge tone="success" icon={<CircleCheck />} label={t("chipActive")} />
      ) : null}
      {standing.hasFrozenMembership ? (
        <StatusBadge tone="info" icon={<Snowflake />} label={t("chipFrozen")} />
      ) : null}
      {standing.hasScheduledMembership ? (
        <StatusBadge tone="info" icon={<CalendarClock />} label={t("chipScheduled")} />
      ) : null}
      {none ? <StatusBadge tone="warning" icon={<CircleOff />} label={t("chipNone")} /> : null}
    </span>
  );
}

/**
 * The strip's one aggregate money fact (§D3.1 L3): what is owed **now** — the shipped
 * outstanding definition (excludes unstarted scheduled memberships; a renewal's own balance
 * is the Next card's fact, never conflated here — §0.3).
 */
function MoneyLine({ owed }: { owed: MemberOutstandingBalance }) {
  const t = useTranslations("members");
  const tMoney = useTranslations("money");
  if (owed.hasOutstanding) {
    return (
      <span className="flex items-center gap-2 font-semibold text-warning-text">
        <TriangleAlert aria-hidden className="size-4 shrink-0" />
        <span>
          {tMoney("owes")}{" "}
          {owed.currency ? (
            <MetricValue value={owed.totalMinor} format="currency" currency={owed.currency} />
          ) : null}
        </span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 text-success-text">
      <CircleCheck aria-hidden className="size-4 shrink-0" />
      <span>{t("paidUp")}</span>
    </span>
  );
}

/** Zone 3 — Member info folded card; phone + trainer promoted into the fold header (§D9). */
function MemberInfoCard({
  member,
  perms,
  trainerOptions,
}: {
  member: MemberDetail;
  perms: WorkspacePermissions;
  trainerOptions: TrainerOption[];
}) {
  const t = useTranslations("members");
  const showLifecycleControls =
    (perms.canArchive || perms.canReactivate) &&
    (member.status === "ACTIVE" ? perms.canArchive : perms.canReactivate);
  return (
    <Disclosure
      title={t("infoTitle")}
      className="lg:col-span-5"
      summary={
        <>
          <span dir={member.phone || member.email ? "ltr" : undefined}>
            {member.phone ?? member.email ?? t("infoNoContact")}
          </span>
          {" · "}
          {member.trainerName ? (
            <>
              {t("colTrainer")} <span dir="auto">{member.trainerName}</span>
            </>
          ) : (
            t("infoNoTrainer")
          )}
        </>
      }
      headerAction={
        perms.canUpdate ? (
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link href={`/members/${member.id}/edit`}>
              <Pencil aria-hidden className="size-4" />
              {t("editMember")}
            </Link>
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        {perms.canReadAssignments ? (
          <InfoGroup title={t("colTrainer")}>
            {perms.canManageAssignments ? (
              <AssignTrainerForm
                memberId={member.id}
                currentTrainerGymUserId={member.trainerGymUserId}
                options={trainerOptions}
              />
            ) : (
              <p className="text-body text-foreground" dir="auto">
                {member.trainerName ?? (
                  <span className="text-muted-foreground">{t("infoNoTrainer")}</span>
                )}
              </p>
            )}
          </InfoGroup>
        ) : null}

        <InfoGroup title={t("colContact")}>
          <dl className="flex flex-col gap-3">
            <Detail label={t("phone")} value={member.phone} ltr />
            <Detail label={t("email")} value={member.email} ltr />
          </dl>
        </InfoGroup>

        <InfoGroup title={t("groupDetails")}>
          <dl className="flex flex-col gap-3">
            <Detail label={t("dob")} date={member.dateOfBirth} />
            <Detail label={t("gender")} value={member.gender} />
            <Detail label={t("colJoined")} date={member.joinedOn} />
          </dl>
        </InfoGroup>

        <InfoGroup title={t("groupMembership")}>
          <div className="flex flex-col items-start gap-3">
            <MemberStatusBadge status={member.status} withNoun />
            {showLifecycleControls ? (
              <MemberArchiveControls
                memberId={member.id}
                status={member.status}
                canArchive={perms.canArchive}
                canReactivate={perms.canReactivate}
              />
            ) : null}
          </div>
        </InfoGroup>
      </div>
    </Disclosure>
  );
}

function InfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-body font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Detail({
  label,
  value,
  date,
  ltr = false,
}: {
  label: string;
  value?: string | null;
  date?: Date | null;
  /** Force LTR for phone/email values inside an RTL layout (Authority D8.3). */
  ltr?: boolean;
}) {
  const t = useTranslations("members");
  const locale = useLocale();
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-body-sm text-muted-foreground">{label}</dt>
      <dd className="text-body break-words text-foreground">
        {date ? (
          <time dateTime={toISODate(date)} className="tabular">
            {formatDate(date, locale, "iso")}
          </time>
        ) : value ? (
          <span dir={ltr ? "ltr" : undefined}>{value}</span>
        ) : (
          <span className="text-muted-foreground">{t("dash")}</span>
        )}
      </dd>
    </div>
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
