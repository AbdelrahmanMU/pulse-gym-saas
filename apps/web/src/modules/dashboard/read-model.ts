import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { PERMISSION_KEYS } from "@pulse/auth";
import { authorize } from "@/lib/auth/assert";
import { systemClock } from "@/lib/platform/clock";
import { getMembershipOverview, type MembershipOverview } from "@/modules/memberships";
import {
  getRevenueSummary,
  getOutstandingBalances,
  type RevenueSummary,
  type OutstandingBalances,
} from "@/modules/payments";
import { listRecentMembers, type RecentMemberRow } from "@/modules/members";

/**
 * Dashboard Read Model (Sprint-1 Epic-6) — the **single source** the Operations Dashboard reads.
 * It composes the other contexts **only through their public `index` entries** (constitution §2;
 * the `no-cross-context` fitness rule). It performs **no business calculation** of its own: every
 * value is already derived inside its home module (membership status via the lifecycle engine,
 * revenue/outstanding via the payment ledger). The UI, in turn, does zero math — it renders this.
 *
 * Gated by `dashboard.view`; each composed read authorizes its own domain permission
 * (`memberships.read` / `payments.read` / `members.read`). Every seeded role that holds
 * `dashboard.view` also holds those reads, so the composition never partially fails for a real
 * actor. Time comes from one injected {@link IClock} shared across all sub-reads, so Today / MTD /
 * expiry are all judged at the same instant in the gym time zone.
 */
export interface DashboardData {
  overview: MembershipOverview;
  revenue: RevenueSummary;
  outstanding: OutstandingBalances;
  recentMembers: RecentMemberRow[];
}

export async function getDashboardData(
  principal: AuthenticatedPrincipal,
  clock: IClock = systemClock,
): Promise<DashboardData> {
  authorize(principal, PERMISSION_KEYS.DASHBOARD_VIEW);
  const [overview, revenue, outstanding, recentMembers] = await Promise.all([
    getMembershipOverview(principal, clock),
    getRevenueSummary(principal, clock),
    getOutstandingBalances(principal),
    listRecentMembers(principal),
  ]);
  return { overview, revenue, outstanding, recentMembers };
}
