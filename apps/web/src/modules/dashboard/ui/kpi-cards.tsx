import {
  CalendarClock,
  CircleOff,
  Snowflake,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { KPIGrid } from "@/components/pulse/kpi-grid";
import { StatCard } from "@/components/pulse/stat-card";
import type { DashboardData } from "../read-model";

/**
 * The dashboard KPI band (Epic-6) — seven derived StatCards in a responsive KPIGrid. Every value
 * is already derived in the read model (membership-status counts + ledger revenue); this component
 * only maps them onto cards. Status cards deep-link to the filtered memberships list. Server-only.
 *
 * Order is operational-first (v1.2 AP-2 / §6, DD-8): the *urgent* counts (Expiring Soon, Expired)
 * lead before the population counts and revenue — on a phone the owner sees "what needs attention"
 * without scrolling; on desktop the same order simply leads the grid.
 */
export function KpiCards({ overview, revenue }: Pick<DashboardData, "overview" | "revenue">) {
  return (
    <KPIGrid>
      <StatCard
        label="Expiring Soon"
        value={overview.counts.expiringSoon}
        icon={<TriangleAlert />}
        hint="See the list below to renew"
      />
      <StatCard
        label="Expired"
        value={overview.counts.expired}
        icon={<CircleOff />}
        href="/memberships?status=EXPIRED"
      />
      <StatCard
        label="Active Members"
        value={overview.counts.active}
        icon={<Users />}
        href="/memberships?status=ACTIVE"
      />
      <StatCard
        label="Frozen"
        value={overview.counts.frozen}
        icon={<Snowflake />}
        href="/memberships?status=FROZEN"
      />
      <StatCard
        label="Scheduled"
        value={overview.counts.scheduled}
        icon={<CalendarClock />}
        href="/memberships?status=SCHEDULED"
      />
      <StatCard
        label="Revenue Today"
        value={revenue.todayMinor}
        format="currency"
        currency={revenue.currency}
        icon={<Wallet />}
      />
      <StatCard
        label="Revenue This Month"
        value={revenue.monthMinor}
        format="currency"
        currency={revenue.currency}
        icon={<TrendingUp />}
      />
    </KPIGrid>
  );
}
