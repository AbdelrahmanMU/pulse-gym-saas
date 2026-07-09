import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarClock, CircleOff, TriangleAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import { EmptyState } from "@/components/pulse/empty-state";
import { formatDate, toISODate } from "@/lib/format-date";
import type { OverviewRow, ExpiringReport } from "@/modules/memberships";

/**
 * Expiring Membership report (Epic-8, RPT-2) — three sections: expiring within 7 days, within 30 days
 * (**cumulative**, includes the 7-day set), and already expired. Buckets use fixed windows and derived
 * remaining days (never the gym-configurable expiring-soon indicator, never stale caches). This view
 * does zero math. Async server component; catalogued components + tokens only.
 */
function Section({
  title,
  subtitle,
  icon,
  rows,
  emptyTitle,
  columns,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  rows: OverviewRow[];
  emptyTitle: string;
  columns: DataTableColumn<OverviewRow>[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="flex items-center gap-2 text-h3 text-foreground">
          <span aria-hidden className="text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
          {title}
          <span className="tabular text-body-sm font-normal text-muted-foreground">
            ({rows.length})
          </span>
        </h2>
        {subtitle ? <p className="text-body-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.membershipId}
        cardMode
        caption={title}
        empty={<EmptyState title={emptyTitle} />}
      />
    </section>
  );
}

export async function ExpiringReportView({ report }: { report: ExpiringReport }) {
  const t = await getTranslations("reports");
  const locale = await getLocale();

  const daysLabel = (remainingDays: number): string => {
    if (remainingDays > 0) return t("daysLeft", { days: remainingDays, n: String(remainingDays) });
    if (remainingDays === 0) return t("expiresToday");
    const ago = -remainingDays;
    return t("daysAgo", { days: ago, n: String(ago) });
  };

  const columns: DataTableColumn<OverviewRow>[] = [
    {
      key: "member",
      header: t("colMember"),
      render: (r) => (
        <Link
          href={`/memberships/${r.membershipId}`}
          className="text-foreground hover:text-accent-text focus-visible:text-accent-text"
        >
          {r.memberName}
        </Link>
      ),
    },
    { key: "plan", header: t("colPlan"), render: (r) => r.planName, priority: 2 },
    {
      key: "end",
      header: t("colEndDate"),
      numeric: true,
      render: (r) => (
        <time dateTime={toISODate(r.effectiveEndDate)}>
          {formatDate(r.effectiveEndDate, locale, "iso")}
        </time>
      ),
    },
    { key: "when", header: t("colWhen"), numeric: true, render: (r) => daysLabel(r.remainingDays) },
  ];

  return (
    <div className="flex flex-col gap-8">
      <Section
        title={t("within7Title")}
        icon={<TriangleAlert />}
        rows={report.within7}
        emptyTitle={t("within7Empty")}
        columns={columns}
      />
      <Section
        title={t("within30Title")}
        subtitle={t("within30Subtitle")}
        icon={<CalendarClock />}
        rows={report.within30}
        emptyTitle={t("within30Empty")}
        columns={columns}
      />
      <Section
        title={t("expiredTitle")}
        icon={<CircleOff />}
        rows={report.expired}
        emptyTitle={t("expiredEmpty")}
        columns={columns}
      />
    </div>
  );
}
