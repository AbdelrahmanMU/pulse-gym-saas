import Link from "next/link";
import { Wallet } from "lucide-react";
import { KPIGrid } from "@/components/pulse/kpi-grid";
import { StatCard } from "@/components/pulse/stat-card";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import { MetricValue } from "@/components/pulse/metric-value";
import { EmptyState } from "@/components/pulse/empty-state";
import type { OutstandingReport, OutstandingReportRow } from "@/modules/payments";

/**
 * Outstanding Balance report (Epic-8) — every membership with a balance due: Member · Membership ·
 * Price · Paid · Balance. Price/Paid/Balance are the ledger's `summarizeLedger` derivation (same
 * "outstanding" definition as the dashboard widget: cancelled + not-yet-started excluded). This view
 * does zero math; money via MetricValue. Server-rendered; catalogued components + tokens only.
 */
const columns: DataTableColumn<OutstandingReportRow>[] = [
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
  { key: "plan", header: "Membership", render: (r) => r.planName, priority: 2 },
  {
    key: "price",
    header: "Price",
    numeric: true,
    priority: 3,
    render: (r) => <MetricValue value={r.priceMinor} format="currency" currency={r.currency} />,
  },
  {
    key: "paid",
    header: "Paid",
    numeric: true,
    priority: 2,
    render: (r) => <MetricValue value={r.paidMinor} format="currency" currency={r.currency} />,
  },
  {
    key: "balance",
    header: "Balance",
    numeric: true,
    render: (r) => (
      <MetricValue
        value={r.remainingMinor}
        format="currency"
        currency={r.currency}
        className="font-semibold text-foreground"
      />
    ),
  },
];

export function OutstandingReportView({ report }: { report: OutstandingReport }) {
  return (
    <div className="flex flex-col gap-6">
      <KPIGrid>
        <StatCard
          label="Total outstanding"
          value={report.totalOutstandingMinor}
          format="currency"
          currency={report.currency}
          icon={<Wallet />}
        />
        <StatCard label="Memberships with a balance" value={report.count} />
      </KPIGrid>

      <DataTable
        columns={columns}
        rows={report.rows}
        rowKey={(r) => r.membershipId}
        caption="Memberships with an outstanding balance"
        empty={
          <EmptyState
            icon={<Wallet aria-hidden />}
            title="No balances due"
            description="Every membership is fully paid."
          />
        }
      />
    </div>
  );
}
