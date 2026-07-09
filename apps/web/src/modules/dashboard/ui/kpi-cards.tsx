import {
  CalendarClock,
  CircleOff,
  Snowflake,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
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
export async function KpiCards({ overview, revenue }: Pick<DashboardData, "overview" | "revenue">) {
  // Parent namespace + `kpi.` key prefix (not getTranslations("dashboard.kpi")): an
  // all-lowercase dotted arg trips the hardcoded-permission-key lint rule (T-27).
  const t = await getTranslations("dashboard");
  return (
    <KPIGrid>
      <StatCard
        label={t("kpi.expiringSoon")}
        value={overview.counts.expiringSoon}
        icon={<TriangleAlert />}
        hint={t("kpi.expiringHint")}
      />
      <StatCard
        label={t("kpi.expired")}
        value={overview.counts.expired}
        icon={<CircleOff />}
        href="/memberships?status=EXPIRED"
      />
      <StatCard
        label={t("kpi.activeMemberships")}
        value={overview.counts.active}
        icon={<Users />}
        href="/memberships?status=ACTIVE"
      />
      <StatCard
        label={t("kpi.frozen")}
        value={overview.counts.frozen}
        icon={<Snowflake />}
        href="/memberships?status=FROZEN"
      />
      <StatCard
        label={t("kpi.scheduled")}
        value={overview.counts.scheduled}
        icon={<CalendarClock />}
        href="/memberships?status=SCHEDULED"
      />
      <StatCard
        label={t("kpi.revenueToday")}
        value={revenue.todayMinor}
        format="currency"
        currency={revenue.currency}
        icon={<Wallet />}
      />
      <StatCard
        label={t("kpi.revenueMonth")}
        value={revenue.monthMinor}
        format="currency"
        currency={revenue.currency}
        icon={<TrendingUp />}
      />
    </KPIGrid>
  );
}
