import Link from "next/link";
import { redirect } from "next/navigation";
import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { needsOnboarding } from "@/modules/gym/queries";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";

/**
 * The permission-gated dashboard (T-07 demo of T-20), now rendered inside the real
 * Application Shell (T-08). Access is decided **by permission** (`dashboard.view`), never
 * by role. The seeded Owner holds it; an actor lacking it sees the inline **Forbidden**
 * `ErrorState` (T-17, decision 0.3.7 — a 403 is an expected in-page outcome, not a thrown
 * boundary error). Unauthenticated access is handled one level up by the `(app)` layout.
 *
 * No business logic here — `app/` is routing only (constitution §2). Real dashboard
 * content (KPIs, revenue, activity) is a later feature phase.
 */
export default async function DashboardPage() {
  // First-run: guide a setup-capable owner through onboarding before the dashboard.
  if (await needsOnboarding()) redirect("/onboarding/gym");

  let displayName: string;
  try {
    const principal = await requirePermission(PERMISSION_KEYS.DASHBOARD_VIEW);
    displayName = principal.displayName;
  } catch (error) {
    if (error instanceof AuthorizationError) {
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
    throw error;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle={`Signed in as ${displayName}. Real dashboard content arrives in a later phase.`}
        actions={
          <Button asChild variant="secondary">
            <Link href="/ui-states">View UI states</Link>
          </Button>
        }
      />
      <p className="text-body text-muted-foreground">
        This is the authenticated application shell — structural only for Sprint&nbsp;0. Navigation
        links under “Manage” are placeholders until their feature slices exist.
      </p>
    </PageContainer>
  );
}
