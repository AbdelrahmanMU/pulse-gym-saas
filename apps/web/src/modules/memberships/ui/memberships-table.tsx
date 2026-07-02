import type { ReactNode } from "react";
import Link from "next/link";
import { MembershipStatus } from "@pulse/db";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import { MetricValue } from "@/components/pulse/metric-value";
import type { MembershipRow } from "../service";
import { remainingDaysLabel } from "../format";
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

/**
 * AP-1 mobile card — operational-first order (v1.2 §6 / adaptive-design-report §5):
 * P0 status · remaining days → P1 member (link) · plan · ends → P2 price snapshot.
 */
function MembershipCard(m: MembershipRow) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <MembershipStatusBadge status={m.status} isExpiringSoon={m.isExpiringSoon} size="sm" />
        <span className="text-body-sm text-muted-foreground">
          {remainingDaysLabel(m.status, m.remainingDays)}
        </span>
      </div>
      <Link
        href={`/memberships/${m.id}`}
        className="font-medium text-body-lg text-foreground hover:underline"
      >
        {m.memberName}
      </Link>
      <div className="flex items-baseline justify-between gap-3 text-body-sm">
        <span className="text-foreground">{m.planName}</span>
        <span className="text-muted-foreground">
          Ends{" "}
          <time dateTime={m.effectiveEndDate} className="tabular">
            {m.effectiveEndDate}
          </time>
          {m.status === MembershipStatus.FROZEN ? " · extends on resume" : null}
        </span>
      </div>
      <MetricValue value={m.priceMinor} format="currency" currency={m.currency} size="sm" />
    </div>
  );
}

export function MembershipsTable({ rows, empty }: { rows: MembershipRow[]; empty?: ReactNode }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(m) => m.id}
      caption="Memberships"
      empty={empty}
      renderCard={MembershipCard}
    />
  );
}
