import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { loadExpiringReport } from "@/modules/reports/queries";
import { ExpiringReportView } from "@/modules/reports/ui/expiring-report";
import { ReportForbidden } from "@/modules/reports/ui/report-forbidden";

/**
 * Expiring Membership report (Sprint-1 Epic-8). Gated by `reports.view` (inline Forbidden on deny).
 * Fixed 7-/30-day buckets + already-expired, derived from the membership lifecycle. Routing only.
 */
export default async function ExpiringReportPage() {
  let report;
  try {
    await requirePermission(PERMISSION_KEYS.REPORTS_VIEW);
    report = await loadExpiringReport();
  } catch (error) {
    if (error instanceof AuthorizationError) return <ReportForbidden />;
    throw error;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Expiring memberships"
        subtitle="Upcoming and past expirations to drive renewals."
      />
      <ExpiringReportView report={report} />
    </PageContainer>
  );
}
