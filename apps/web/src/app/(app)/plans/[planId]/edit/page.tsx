import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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

  const t = await getTranslations("plans");

  return (
    <PageContainer width="narrow">
      <PageHeader title={t("editTitle")} subtitle={plan.name} />
      <PlanForm
        action={updatePlanAction}
        currency={plan.currency}
        initial={plan}
        planId={plan.id}
        submitLabel={t("formSaveChanges")}
      />
    </PageContainer>
  );
}

async function Forbidden() {
  const t = await getTranslations("errors");
  return (
    <PageContainer width="narrow">
      <ErrorState
        variant="inline"
        title={t("accessDenied")}
        description={t("forbiddenBody")}
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">{t("backToDashboard")}</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
