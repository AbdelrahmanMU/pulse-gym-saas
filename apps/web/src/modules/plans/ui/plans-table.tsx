import type { ReactNode } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import { MetricValue } from "@/components/pulse/metric-value";
import type { PlanRow } from "../service";
import { formatDuration } from "../format";
import { PlanStatusBadge } from "./plan-status-badge";

/**
 * Plans table — maps `PlanRow`s onto the canonical DataTable (Catalog §DataTable). The name
 * links to the plan; price renders via MetricValue (mono-tabular, server-formatted money);
 * status via PlanStatusBadge. Async server component so headers/duration read the active locale.
 */
export async function PlansTable({ rows, empty }: { rows: PlanRow[]; empty?: ReactNode }) {
  const t = await getTranslations("plans");
  const locale = await getLocale();

  const columns: DataTableColumn<PlanRow>[] = [
    {
      key: "name",
      header: t("colName"),
      render: (p) => (
        <Link href={`/plans/${p.id}`} className="font-medium text-foreground hover:underline">
          {p.name}
        </Link>
      ),
    },
    {
      key: "status",
      header: t("colStatus"),
      render: (p) => <PlanStatusBadge isActive={p.isActive} size="sm" />,
    },
    {
      key: "duration",
      header: t("colDuration"),
      priority: 2,
      render: (p) => formatDuration(p.durationValue, p.durationUnit, locale),
    },
    {
      key: "price",
      header: t("colPrice"),
      numeric: true,
      render: (p) => <MetricValue value={p.priceMinor} format="currency" currency={p.currency} />,
    },
  ];

  /**
   * AP-1 mobile card — operational-first order (v1.2 §6 / adaptive-design-report §4):
   * P0 price · active/archived status → P1 name (link) · duration.
   */
  const renderCard = (p: PlanRow): ReactNode => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <PlanStatusBadge isActive={p.isActive} size="sm" />
        <MetricValue value={p.priceMinor} format="currency" currency={p.currency} size="sm" />
      </div>
      <Link
        href={`/plans/${p.id}`}
        className="font-medium text-body-lg text-foreground hover:underline"
      >
        {p.name}
      </Link>
      <span className="text-body-sm text-muted-foreground">
        {formatDuration(p.durationValue, p.durationUnit, locale)}
      </span>
    </div>
  );

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(p) => p.id}
      caption={t("caption")}
      empty={empty}
      renderCard={renderCard}
    />
  );
}
