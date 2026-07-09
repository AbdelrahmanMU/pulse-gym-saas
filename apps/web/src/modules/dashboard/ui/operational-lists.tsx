import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarPlus, CircleOff, TriangleAlert, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MetricValue } from "@/components/pulse/metric-value";
import { EmptyState } from "@/components/pulse/empty-state";
import type { DashboardData } from "../read-model";
import type { OverviewRow } from "@/modules/memberships";
import type { OutstandingBalanceRow } from "@/modules/payments";
import type { RecentMemberRow } from "@/modules/members";

/**
 * The dashboard operational lists (Epic-6) — "what needs attention today". Each panel is a
 * semantic `<section>` with a heading and a scrollable `<ul>`; every row links to its detail so
 * staff can act. Presentation only — all values are derived upstream in the read model. Dates use
 * `<time>`; money uses MetricValue. Catalogued components + tokens only; server-rendered.
 */
export async function OperationalLists({
  overview,
  outstanding,
  recentMembers,
}: Pick<DashboardData, "overview" | "outstanding" | "recentMembers">) {
  const t = await getTranslations("dashboard");
  const remaining = (days: number): string =>
    days <= 0 ? t("expiresToday") : t("remainingDays", { days, n: String(days) });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel
        title={t("lists.expiringSoon")}
        icon={<TriangleAlert />}
        count={overview.counts.expiringSoon}
      >
        {overview.expiringSoon.length === 0 ? (
          <EmptyState title={t("empty.expiringTitle")} description={t("empty.expiringBody")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {overview.expiringSoon.map((row) => (
              <MembershipRow key={row.membershipId} row={row} meta={remaining(row.remainingDays)} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title={t("lists.expiredNeedRenewal")}
        icon={<CircleOff />}
        count={overview.counts.expired}
      >
        {overview.expired.length === 0 ? (
          <EmptyState title={t("empty.expiredTitle")} description={t("empty.expiredBody")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {overview.expired.map((row) => (
              <MembershipRow
                key={row.membershipId}
                row={row}
                meta={<EndedOn iso={row.effectiveEndDate} />}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t("lists.outstanding")} icon={<Wallet />} count={outstanding.count}>
        {outstanding.rows.length === 0 ? (
          <EmptyState
            title={t("empty.outstandingTitle")}
            description={t("empty.outstandingBody")}
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {outstanding.rows.map((row) => (
              <OutstandingRow key={row.membershipId} row={row} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t("lists.recentMembers")} icon={<CalendarPlus />}>
        {recentMembers.length === 0 ? (
          <EmptyState title={t("empty.membersTitle")} description={t("empty.membersBody")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {recentMembers.map((row) => (
              <RecentRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: ReactNode;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6">
      <h2 className="flex items-center gap-2 text-h3 text-foreground">
        <span aria-hidden className="text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
        {title}
        {count && count > 0 ? (
          <span className="tabular text-body-sm font-normal text-muted-foreground">({count})</span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

function MembershipRow({ row, meta }: { row: OverviewRow; meta: ReactNode }) {
  return (
    <li>
      <Link
        href={`/memberships/${row.membershipId}`}
        className="flex items-baseline justify-between gap-4 py-2.5 hover:text-accent-text focus-visible:text-accent-text"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-body text-foreground">{row.memberName}</span>
          <span className="text-body-sm text-muted-foreground">{row.planName}</span>
        </span>
        <span className="shrink-0 text-body-sm text-muted-foreground">{meta}</span>
      </Link>
    </li>
  );
}

function OutstandingRow({ row }: { row: OutstandingBalanceRow }) {
  return (
    <li>
      <Link
        href={`/memberships/${row.membershipId}`}
        className="flex items-baseline justify-between gap-4 py-2.5 hover:text-accent-text focus-visible:text-accent-text"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-body text-foreground">{row.memberName}</span>
          <span className="text-body-sm text-muted-foreground">{row.planName}</span>
        </span>
        <MetricValue
          value={row.remainingMinor}
          format="currency"
          currency={row.currency}
          size="sm"
          className="shrink-0"
        />
      </Link>
    </li>
  );
}

function RecentRow({ row }: { row: RecentMemberRow }) {
  const joined = row.joinedOn ?? row.createdAt;
  return (
    <li>
      <Link
        href={`/members/${row.id}`}
        className="flex items-baseline justify-between gap-4 py-2.5 hover:text-accent-text focus-visible:text-accent-text"
      >
        <span className="text-body text-foreground">{row.fullName}</span>
        <EndedOn iso={joined.toISOString().slice(0, 10)} />
      </Link>
    </li>
  );
}

function EndedOn({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} className="tabular shrink-0 text-body-sm text-muted-foreground">
      {iso}
    </time>
  );
}
