import Link from "next/link";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { needsOnboarding } from "@/modules/gym/queries";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { loadDashboard } from "@/modules/dashboard/queries";
import { KpiCards } from "@/modules/dashboard/ui/kpi-cards";
import { OperationalLists } from "@/modules/dashboard/ui/operational-lists";
import { QuickActions } from "@/modules/dashboard/ui/quick-actions";

/**
 * Operations Dashboard (Sprint-1 Epic-6) — the daily operational home screen: *what needs
 * attention today?*. Gated **by permission** (`dashboard.view`); a missing permission renders the
 * inline Forbidden ErrorState (an expected in-page outcome, not a thrown boundary). First-run
 * owners are routed to onboarding first. All data comes from the dedicated Dashboard Read Model
 * (`modules/dashboard`), which derives everything from the Membership engine + Payment ledger — the
 * page performs no business calculation (constitution §2). Fully server-rendered; refresh rides the
 * existing `revalidatePath("/dashboard")` on KPI-affecting mutations.
 */
export default async function DashboardPage() {
  // First-run: guide a setup-capable owner through onboarding before the dashboard.
  if (await needsOnboarding()) redirect("/onboarding/gym");

  let principal;
  try {
    principal = await requirePermission(PERMISSION_KEYS.DASHBOARD_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const data = await loadDashboard();
  const perms = {
    canAddMember: hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERS_CREATE),
    canSellMembership: hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_CREATE),
    canRecordPayment: hasPermission(principal.permissions, PERMISSION_KEYS.PAYMENTS_RECORD),
  };

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Dashboard"
        subtitle={`Signed in as ${principal.displayName}. Here’s what needs attention today.`}
        actions={<QuickActions perms={perms} />}
      />

      <div className="flex flex-col gap-8">
        <KpiCards overview={data.overview} revenue={data.revenue} />
        <OperationalLists
          overview={data.overview}
          outstanding={data.outstanding}
          recentMembers={data.recentMembers}
        />
      </div>
    </PageContainer>
  );
}

function Forbidden() {
  return (
    <PageContainer width="narrow">
      <ErrorState
        variant="inline"
        title="Access denied"
        description="You don't have permission to view this page. If you believe this is a mistake, contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/sign-in">Switch account</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
