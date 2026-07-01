import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { loadMembershipReport } from "@/modules/reports/queries";
import { MembershipReportView } from "@/modules/reports/ui/membership-report";
import { ReportForbidden } from "@/modules/reports/ui/report-forbidden";

/**
 * Membership report (Sprint-1 Epic-8). Gated by `reports.view` (inline Forbidden on deny). Status
 * counts + a filtered, paginated membership list, reused from the memberships read models. Routing
 * only; filter parsing is delegated to the memberships params schema.
 */
type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function MembershipReportPage({
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
  const raw = { q: first(sp.q), status: first(sp.status), page: first(sp.page) };
  const data = await loadMembershipReport(raw);
  const status = raw.status ?? "ALL";

  const statusHref = (s: string): string =>
    s === "ALL" ? "/reports/memberships" : `/reports/memberships?status=${s}`;
  const pageHref = (page: number): string => {
    const params = new URLSearchParams();
    if (raw.status) params.set("status", raw.status);
    params.set("page", String(page));
    return `/reports/memberships?${params.toString()}`;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Membership report"
        subtitle="Membership counts by status, with filtering."
      />
      <MembershipReportView
        data={data}
        status={status}
        statusHref={statusHref}
        pageHref={pageHref}
      />
    </PageContainer>
  );
}
