import { requireSession } from "@/lib/auth/guard";
import { MembershipListParamsSchema, type ExpiringReport } from "@/modules/memberships";
import type { OutstandingReport, RevenueReport } from "@/modules/payments";
import {
  getExpiringReportData,
  getMembershipReportData,
  getOutstandingReportData,
  getRevenueReportData,
  type MembershipReportData,
} from "./read-model";
import { parseRevenueRange } from "./validation";

/**
 * RSC read entry points for Operational Reports (Sprint-1 Epic-8). Each resolves the authenticated
 * principal (the `(app)` layout already enforced the session) and delegates to the {@link ./read-model}
 * composition, which authorizes `reports.view` and scopes by gym. Pages call these; they never read the
 * session, query Prisma, or compute business values directly (constitution §2). The membership report
 * reuses the memberships module's own params schema, so filter parsing never drifts.
 */
export async function loadRevenueReport(from?: string, to?: string): Promise<RevenueReport> {
  const principal = await requireSession();
  return getRevenueReportData(principal, parseRevenueRange(from, to));
}

export async function loadMembershipReport(
  rawParams: Record<string, string | undefined>,
): Promise<MembershipReportData> {
  const principal = await requireSession();
  return getMembershipReportData(principal, MembershipListParamsSchema.parse(rawParams));
}

export async function loadOutstandingReport(): Promise<OutstandingReport> {
  const principal = await requireSession();
  return getOutstandingReportData(principal);
}

export async function loadExpiringReport(): Promise<ExpiringReport> {
  const principal = await requireSession();
  return getExpiringReportData(principal);
}
