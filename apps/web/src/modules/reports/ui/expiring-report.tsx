import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarClock, CircleOff, TriangleAlert } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import { EmptyState } from "@/components/pulse/empty-state";
import type { OverviewRow, ExpiringReport } from "@/modules/memberships";

/**
 * Expiring Membership report (Epic-8, RPT-2) — three sections: expiring within 7 days, within 30 days
 * (**cumulative**, includes the 7-day set), and already expired. Buckets use fixed windows and derived
 * remaining days (never the gym-configurable expiring-soon indicator, never stale caches). This view
 * does zero math. Server-rendered; catalogued components + tokens only.
 */
function daysLabel(remainingDays: number): string {
  if (remainingDays > 0) return `${remainingDays} day${remainingDays === 1 ? "" : "s"} left`;
  if (remainingDays === 0) return "Expires today";
  const ago = -remainingDays;
  return `${ago} day${ago === 1 ? "" : "s"} ago`;
}

const columns: DataTableColumn<OverviewRow>[] = [
  {
    key: "member",
    header: "Member",
    render: (r) => (
      <Link
        href={`/memberships/${r.membershipId}`}
        className="text-foreground hover:text-accent-text focus-visible:text-accent-text"
      >
        {r.memberName}
      </Link>
    ),
  },
  { key: "plan", header: "Plan", render: (r) => r.planName, priority: 2 },
  {
    key: "end",
    header: "End date",
    numeric: true,
    render: (r) => <time dateTime={r.effectiveEndDate}>{r.effectiveEndDate}</time>,
  },
  { key: "when", header: "When", numeric: true, render: (r) => daysLabel(r.remainingDays) },
];

function Section({
  title,
  subtitle,
  icon,
  rows,
  emptyTitle,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  rows: OverviewRow[];
  emptyTitle: string;
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

export function ExpiringReportView({ report }: { report: ExpiringReport }) {
  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Expiring within 7 days"
        icon={<TriangleAlert />}
        rows={report.within7}
        emptyTitle="Nothing expiring in the next 7 days"
      />
      <Section
        title="Expiring within 30 days"
        subtitle="Cumulative — includes the next 7 days."
        icon={<CalendarClock />}
        rows={report.within30}
        emptyTitle="Nothing expiring in the next 30 days"
      />
      <Section
        title="Already expired"
        icon={<CircleOff />}
        rows={report.expired}
        emptyTitle="No expired memberships"
      />
    </div>
  );
}
