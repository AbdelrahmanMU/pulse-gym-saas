import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { PERMISSION_KEYS } from "@pulse/auth";
import { authorize } from "@/lib/auth/assert";
import { systemClock } from "@/lib/platform/clock";
import {
  getExpiringReport,
  getMembershipOverview,
  listMemberships,
  type ExpiringReport,
  type MembershipListParams,
  type MembershipListResult,
  type MembershipOverview,
} from "@/modules/memberships";
import {
  getOutstandingBalanceReport,
  getRevenueReport,
  type OutstandingReport,
  type RevenueReport,
} from "@/modules/payments";
import type { RevenueRange } from "./validation";

/**
 * Reports Read Models (Sprint-1 Epic-8) — the **single source** each Operational Report reads. Like
 * the dashboard (Epic-6), they compose the membership + payment contexts **only through their public
 * `index` entries** (constitution §2; the `no-cross-context` fitness rule) and perform **no business
 * calculation** of their own: revenue is the ledger's `sumRevenueInRange`, balances are
 * `summarizeLedger`, and status/expiry counts are the lifecycle `deriveRow` — every number is already
 * derived in its home module. The report UIs do zero math; they render these.
 *
 * Each report authorizes `reports.view`; each composed read authorizes its own domain permission
 * (`memberships.read` / `payments.read`). Every seeded role that holds `reports.view` (Owner, Manager,
 * Accountant) also holds those reads, so a report never partially fails for a real actor.
 */

export interface MembershipReportData {
  counts: MembershipOverview["counts"];
  list: MembershipListResult;
}

export async function getRevenueReportData(
  principal: AuthenticatedPrincipal,
  custom: RevenueRange | null,
  clock: IClock = systemClock,
): Promise<RevenueReport> {
  authorize(principal, PERMISSION_KEYS.REPORTS_VIEW);
  return getRevenueReport(principal, custom, clock);
}

export async function getMembershipReportData(
  principal: AuthenticatedPrincipal,
  params: MembershipListParams,
  clock: IClock = systemClock,
): Promise<MembershipReportData> {
  authorize(principal, PERMISSION_KEYS.REPORTS_VIEW);
  const [overview, list] = await Promise.all([
    getMembershipOverview(principal, clock),
    listMemberships(principal, params, clock),
  ]);
  return { counts: overview.counts, list };
}

export async function getOutstandingReportData(
  principal: AuthenticatedPrincipal,
): Promise<OutstandingReport> {
  authorize(principal, PERMISSION_KEYS.REPORTS_VIEW);
  return getOutstandingBalanceReport(principal);
}

export async function getExpiringReportData(
  principal: AuthenticatedPrincipal,
  clock: IClock = systemClock,
): Promise<ExpiringReport> {
  authorize(principal, PERMISSION_KEYS.REPORTS_VIEW);
  return getExpiringReport(principal, clock);
}
