import type { ReactNode } from "react";
import Link from "next/link";
import { MembershipStatus } from "@pulse/db";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import { MetricValue } from "@/components/pulse/metric-value";
import type { MembershipRow } from "../service";
import { MembershipStatusBadge } from "./membership-status-badge";

/**
 * Memberships table — maps `MembershipRow`s onto the canonical DataTable (Catalog §DataTable).
 * The member name links to the membership; status via MembershipStatusBadge; dates as `<time>`;
 * price via MetricValue (mono-tabular, server-formatted snapshot money). Server component.
 */
const columns: DataTableColumn<MembershipRow>[] = [
  {
    key: "member",
    header: "Member",
    render: (m) => (
      <Link href={`/memberships/${m.id}`} className="font-medium text-foreground hover:underline">
        {m.memberName}
      </Link>
    ),
  },
  { key: "plan", header: "Plan", priority: 2, render: (m) => m.planName },
  {
    key: "status",
    header: "Status",
    render: (m) => (
      <MembershipStatusBadge status={m.status} isExpiringSoon={m.isExpiringSoon} size="sm" />
    ),
  },
  {
    key: "end",
    header: "Ends",
    priority: 2,
    render: (m) => (
      <div className="flex flex-col">
        <time dateTime={m.effectiveEndDate} className="tabular">
          {m.effectiveEndDate}
        </time>
        {m.status === MembershipStatus.FROZEN ? (
          // The stored end holds while frozen; it extends on resume (FRZ-2). Flag it so the
          // un-moved date next to a Frozen badge doesn't read as "the freeze did nothing".
          <span className="text-caption text-muted-foreground">Extends on resume</span>
        ) : null}
      </div>
    ),
  },
  {
    key: "price",
    header: "Price",
    numeric: true,
    render: (m) => <MetricValue value={m.priceMinor} format="currency" currency={m.currency} />,
  },
];

export function MembershipsTable({ rows, empty }: { rows: MembershipRow[]; empty?: ReactNode }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(m) => m.id}
      caption="Memberships"
      empty={empty}
    />
  );
}
