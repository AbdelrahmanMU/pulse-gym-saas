import type { ReactNode } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import { MetricValue } from "@/components/pulse/metric-value";
import type { PlanRow } from "../service";
import { formatDuration } from "../format";
import { PlanStatusBadge } from "./plan-status-badge";

/**
 * Plans table — maps `PlanRow`s onto the canonical DataTable (Catalog §DataTable). The name
 * links to the plan; price renders via MetricValue (mono-tabular, server-formatted money);
 * status via PlanStatusBadge. Server component — presentation only.
 */
const columns: DataTableColumn<PlanRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (p) => (
      <Link href={`/plans/${p.id}`} className="font-medium text-foreground hover:underline">
        {p.name}
      </Link>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (p) => <PlanStatusBadge isActive={p.isActive} size="sm" />,
  },
  {
    key: "duration",
    header: "Duration",
    priority: 2,
    render: (p) => formatDuration(p.durationValue, p.durationUnit),
  },
  {
    key: "price",
    header: "Price",
    numeric: true,
    render: (p) => <MetricValue value={p.priceMinor} format="currency" currency={p.currency} />,
  },
];

export function PlansTable({ rows, empty }: { rows: PlanRow[]; empty?: ReactNode }) {
  return (
    <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} caption="Plans" empty={empty} />
  );
}
