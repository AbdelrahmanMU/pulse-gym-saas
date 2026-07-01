import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { loadRevenueReport } from "@/modules/reports/queries";
import { RevenueReportView } from "@/modules/reports/ui/revenue-report";
import { ReportForbidden } from "@/modules/reports/ui/report-forbidden";

/**
 * Revenue report (Sprint-1 Epic-8). Gated by `reports.view` (inline Forbidden on deny). The custom
 * range is read from `?from&to` and validated in the module; net revenue is derived in the payment
 * ledger. Routing only.
 */
type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function RevenueReportPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  try {
    await requirePermission(PERMISSION_KEYS.REPORTS_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return <ReportForbidden />;
    throw error;
  }

  const sp = await searchParams;
  const report = await loadRevenueReport(first(sp.from), first(sp.to));

  return (
    <PageContainer>
      <PageHeader
        title="Revenue report"
        subtitle="Net revenue over the immutable payment ledger."
      />
      <RevenueReportView report={report} />
    </PageContainer>
  );
}
