import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { MembershipStatus } from "@pulse/db";
import { cn } from "@/lib/utils";
import { KPIGrid } from "@/components/pulse/kpi-grid";
import { StatCard } from "@/components/pulse/stat-card";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import { StatusBadge } from "@/components/pulse/status-badge";
import { MetricValue } from "@/components/pulse/metric-value";
import { EmptyState } from "@/components/pulse/empty-state";
import { Pagination } from "@/components/pulse/pagination";
import type { MembershipRow } from "@/modules/memberships";
import type { MembershipReportData } from "../read-model";
import { membershipStatusMeta } from "../format";

/**
 * Membership report (Epic-8) — the five derived status counts as StatCards, a status filter, and the
 * filtered membership list (reused from the memberships module's `listMemberships`, paginated). Counts
 * come from the lifecycle `deriveRow` (never a stale `cachedStatus` groupBy); this view does zero math.
 * Server-rendered (membership status enum appears). Tokens + catalogued components only.
 */
const FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: MembershipStatus.ACTIVE, label: "Active" },
  { value: MembershipStatus.SCHEDULED, label: "Scheduled" },
  { value: MembershipStatus.FROZEN, label: "Frozen" },
  { value: MembershipStatus.EXPIRED, label: "Expired" },
  { value: MembershipStatus.CANCELLED, label: "Cancelled" },
];

const columns: DataTableColumn<MembershipRow>[] = [
  {
    key: "member",
    header: "Member",
    render: (r) => (
      <Link
        href={`/memberships/${r.id}`}
        className="text-foreground hover:text-accent-text focus-visible:text-accent-text"
      >
        {r.memberName}
      </Link>
    ),
  },
  { key: "plan", header: "Plan", render: (r) => r.planName, priority: 2 },
  {
    key: "status",
    header: "Status",
    render: (r) => {
      const meta = membershipStatusMeta(r.status);
      return <StatusBadge tone={meta.tone} label={meta.label} size="sm" />;
    },
  },
  {
    key: "start",
    header: "Start",
    numeric: true,
    priority: 3,
    render: (r) => <time dateTime={r.startDate}>{r.startDate}</time>,
  },
  {
    key: "end",
    header: "End",
    numeric: true,
    render: (r) => <time dateTime={r.effectiveEndDate}>{r.effectiveEndDate}</time>,
  },
  {
    key: "price",
    header: "Price",
    numeric: true,
    priority: 2,
    render: (r) => <MetricValue value={r.priceMinor} format="currency" currency={r.currency} />,
  },
];

export function MembershipReportView({
  data,
  status,
  statusHref,
  pageHref,
}: {
  data: MembershipReportData;
  status: string;
  statusHref: (status: string) => string;
  pageHref: (page: number) => string;
}) {
  const { counts, list } = data;
  const firstRow = (list.page - 1) * list.pageSize + 1;
  const lastRow = Math.min(list.page * list.pageSize, list.total);

  return (
    <div className="flex flex-col gap-6">
      <KPIGrid>
        <StatCard label="Active" value={counts.active} />
        <StatCard label="Scheduled" value={counts.scheduled} />
        <StatCard label="Frozen" value={counts.frozen} />
        <StatCard label="Expired" value={counts.expired} />
        <StatCard label="Cancelled" value={counts.cancelled} />
      </KPIGrid>

      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={statusHref(f.value)}
            aria-current={status === f.value ? "page" : undefined}
            className={cn(
              "rounded-sm px-3 py-1.5 text-body-sm font-medium transition-colors ease-standard",
              status === f.value
                ? "bg-surface-raised text-foreground"
                : "text-muted-foreground hover:bg-surface-raised",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={list.rows}
        rowKey={(r) => r.id}
        caption="Memberships by status"
        empty={
          <EmptyState
            icon={<ClipboardList aria-hidden />}
            title="No memberships match this filter"
            description="Try a different status."
          />
        }
      />

      {list.totalPages > 1 ? (
        <Pagination
          page={list.page}
          totalPages={list.totalPages}
          hrefForPage={pageHref}
          rangeLabel={`Showing ${firstRow}–${lastRow} of ${list.total}`}
        />
      ) : null}
    </div>
  );
}
