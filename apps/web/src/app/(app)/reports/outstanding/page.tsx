import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { loadOutstandingReport } from "@/modules/reports/queries";
import { OutstandingReportView } from "@/modules/reports/ui/outstanding-report";
import { ReportForbidden } from "@/modules/reports/ui/report-forbidden";

/**
 * Outstanding Balance report (Sprint-1 Epic-8). Gated by `reports.view` (inline Forbidden on deny).
 * Balances are derived per membership over the immutable ledger (`summarizeLedger`). Routing only.
 */
export default async function OutstandingReportPage() {
  let report;
  try {
    await requirePermission(PERMISSION_KEYS.REPORTS_VIEW);
    report = await loadOutstandingReport();
  } catch (error) {
    if (error instanceof AuthorizationError) return <ReportForbidden />;
    throw error;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Outstanding balances"
        subtitle="Memberships with a balance due — price, paid, and remaining."
      />
      <OutstandingReportView report={report} />
    </PageContainer>
  );
}
