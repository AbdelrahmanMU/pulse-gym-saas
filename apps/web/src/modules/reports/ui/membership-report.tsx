import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { MembershipStatus } from "@pulse/db";
import { cn } from "@/lib/utils";
import { KPIGrid } from "@/components/pulse/kpi-grid";
import { StatCard } from "@/components/pulse/stat-card";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import { StatusBadge } from "@/components/pulse/status-badge";
import { MetricValue } from "@/components/pulse/metric-value";
import { EmptyState } from "@/components/pulse/empty-state";
import { Pagination } from "@/components/pulse/pagination";
import { formatDate, toISODate } from "@/lib/format-date";
import type { MembershipRow } from "@/modules/memberships";
import type { MembershipReportData } from "../read-model";
import { membershipStatusMeta } from "../format";

/**
 * Membership report (Epic-8) — the five derived status counts as StatCards, a status filter, and the
 * filtered membership list (reused from the memberships module's `listMemberships`, paginated). Counts
 * come from the lifecycle `deriveRow` (never a stale `cachedStatus` groupBy); this view does zero math.
 * Async server component (membership status enum appears). Tokens + catalogued components only.
 */
export async function MembershipReportView({
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
  const t = await getTranslations("reports");
  const ts = await getTranslations("status");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const { counts, list } = data;
  const firstRow = (list.page - 1) * list.pageSize + 1;
  const lastRow = Math.min(list.page * list.pageSize, list.total);

  const filters: { value: string; label: string }[] = [
    { value: "ALL", label: t("filterAll") },
    { value: MembershipStatus.ACTIVE, label: ts("membershipActive") },
    { value: MembershipStatus.SCHEDULED, label: ts("membershipScheduled") },
    { value: MembershipStatus.FROZEN, label: ts("membershipFrozen") },
    { value: MembershipStatus.EXPIRED, label: ts("membershipExpired") },
    { value: MembershipStatus.CANCELLED, label: ts("membershipCancelled") },
  ];

  const columns: DataTableColumn<MembershipRow>[] = [
    {
      key: "member",
      header: t("colMember"),
      render: (r) => (
        <Link
          href={`/memberships/${r.id}`}
          className="text-foreground hover:text-accent-text focus-visible:text-accent-text"
        >
          {r.memberName}
        </Link>
      ),
    },
    { key: "plan", header: t("colPlan"), render: (r) => r.planName, priority: 2 },
    {
      key: "status",
      header: t("colStatus"),
      render: (r) => {
        const meta = membershipStatusMeta(r.status);
        return <StatusBadge tone={meta.tone} label={ts(meta.labelKey)} size="sm" />;
      },
    },
    {
      key: "start",
      header: t("colStart"),
      numeric: true,
      priority: 3,
      render: (r) => (
        <time dateTime={toISODate(r.startDate)}>{formatDate(r.startDate, locale, "iso")}</time>
      ),
    },
    {
      key: "end",
      header: t("colEnd"),
      numeric: true,
      render: (r) => (
        <time dateTime={toISODate(r.effectiveEndDate)}>
          {formatDate(r.effectiveEndDate, locale, "iso")}
        </time>
      ),
    },
    {
      key: "price",
      header: t("colPrice"),
      numeric: true,
      priority: 2,
      render: (r) => <MetricValue value={r.priceMinor} format="currency" currency={r.currency} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <KPIGrid>
        <StatCard label={ts("membershipActive")} value={counts.active} />
        <StatCard label={ts("membershipScheduled")} value={counts.scheduled} />
        <StatCard label={ts("membershipFrozen")} value={counts.frozen} />
        <StatCard label={ts("membershipExpired")} value={counts.expired} />
        <StatCard label={ts("membershipCancelled")} value={counts.cancelled} />
      </KPIGrid>

      <div
        className="flex flex-wrap items-center gap-1"
        role="group"
        aria-label={t("filterStatusAria")}
      >
        {filters.map((f) => (
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
        cardMode
        caption={t("membershipCaption")}
        empty={
          <EmptyState
            icon={<ClipboardList aria-hidden />}
            title={t("membershipEmptyTitle")}
            description={t("membershipEmptyBody")}
          />
        }
      />

      {list.totalPages > 1 ? (
        <Pagination
          page={list.page}
          totalPages={list.totalPages}
          hrefForPage={pageHref}
          rangeLabel={tc("pageRange", {
            from: String(firstRow),
            to: String(lastRow),
            total: String(list.total),
          })}
        />
      ) : null}
    </div>
  );
}
