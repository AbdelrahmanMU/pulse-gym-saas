import Link from "next/link";
import { notFound } from "next/navigation";
import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { updatePlanAction } from "@/modules/plans/actions";
import { loadPlan } from "@/modules/plans/queries";
import type { PlanDetail } from "@/modules/plans/service";
import { PlanForm } from "@/modules/plans/ui/plan-form";

/**
 * Edit plan (Sprint-1 Epic-3). Gated by `plans.update`. Currency is the plan's own snapshot
 * (unchanged on edit). On success the action redirects to the plan. A cross-gym/unknown id
 * surfaces as 404. Routing only.
 */
export default async function EditPlanPage({ params }: { params: Promise<{ planId: string }> }) {
  try {
    await requirePermission(PERMISSION_KEYS.PLANS_UPDATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const { planId } = await params;
  let plan: PlanDetail;
  try {
    plan = await loadPlan(planId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <PageContainer width="narrow">
      <PageHeader title="Edit plan" subtitle={plan.name} />
      <PlanForm
        action={updatePlanAction}
        currency={plan.currency}
        initial={plan}
        planId={plan.id}
        submitLabel="Save changes"
      />
    </PageContainer>
  );
}

function Forbidden() {
  return (
    <PageContainer width="narrow">
      <ErrorState
        variant="inline"
        title="Access denied"
        description="You don't have permission to edit plans. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/plans">Back to plans</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
