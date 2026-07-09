import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("plans");
  const ta = await getTranslations("actions");

  return (
    <PageContainer width="narrow">
      <PageHeader title={t("newTitle")} subtitle={t("newSubtitle")} />
      <PlanForm action={createPlanAction} currency={currency} submitLabel={ta("addPlan")} />
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
