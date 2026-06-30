import Link from "next/link";
import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { createPlanAction } from "@/modules/plans/actions";
import { loadGymCurrency } from "@/modules/plans/queries";
import { PlanForm } from "@/modules/plans/ui/plan-form";

/**
 * Add plan (Sprint-1 Epic-3). Gated by `plans.create`. The gym's default currency is loaded
 * for the price input; on success the action redirects to the new plan. Routing only.
 */
export default async function NewPlanPage() {
  try {
    await requirePermission(PERMISSION_KEYS.PLANS_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const currency = await loadGymCurrency();

  return (
    <PageContainer width="narrow">
      <PageHeader title="Add plan" subtitle="Create a membership plan staff can sell." />
      <PlanForm action={createPlanAction} currency={currency} submitLabel="Add plan" />
    </PageContainer>
  );
}

function Forbidden() {
  return (
    <PageContainer width="narrow">
      <ErrorState
        variant="inline"
        title="Access denied"
        description="You don't have permission to create plans. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/plans">Back to plans</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
