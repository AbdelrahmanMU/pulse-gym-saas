import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { MetricValue } from "@/components/pulse/metric-value";
import { loadPlan } from "@/modules/plans/queries";
import type { PlanDetail } from "@/modules/plans/service";
import { formatDuration } from "@/modules/plans/format";
import { PlanStatusBadge } from "@/modules/plans/ui/plan-status-badge";
import { PlanLifecycleControls } from "@/modules/plans/ui/plan-lifecycle-controls";

/**
 * Plan detail (Sprint-1 Epic-3). Gated by `plans.read`. Hosts edit (`plans.update`) and
 * archive/restore (`plans.deactivate`), each shown **by permission**. A cross-gym/unknown id
 * surfaces as 404. Routing only — data + mutations live in the plans module (constitution §2).
 */
export default async function PlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  let principal;
  try {
    principal = await requirePermission(PERMISSION_KEYS.PLANS_READ);
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

  const canUpdate = hasPermission(principal.permissions, PERMISSION_KEYS.PLANS_UPDATE);
  const canDeactivate = hasPermission(principal.permissions, PERMISSION_KEYS.PLANS_DEACTIVATE);
  const t = await getTranslations("plans");
  const locale = await getLocale();

  return (
    <PageContainer>
      <PageHeader
        title={plan.name}
        actions={
          canUpdate ? (
            <Button asChild variant="secondary">
              <Link href={`/plans/${plan.id}/edit`}>
                <Pencil aria-hidden className="size-4" />
                {t("editButton")}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6">
        <PlanStatusBadge isActive={plan.isActive} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title={t("detailTerms")}>
          <Detail label={t("detailPrice")}>
            <MetricValue
              value={plan.priceMinor}
              format="currency"
              currency={plan.currency}
              size="lg"
            />
          </Detail>
          <Detail label={t("detailDuration")}>
            {formatDuration(plan.durationValue, plan.durationUnit, locale)}
          </Detail>
        </Section>

        <Section title={t("detailDescription")}>
          {plan.description ? (
            <p className="whitespace-pre-wrap text-body text-foreground">{plan.description}</p>
          ) : (
            <p className="text-body text-muted-foreground">{t("detailNoDescription")}</p>
          )}
        </Section>

        {canDeactivate ? (
          <Section title={t("detailLifecycle")}>
            <PlanLifecycleControls planId={plan.id} isActive={plan.isActive} />
          </Section>
        ) : null}
      </div>
    </PageContainer>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6">
      <h2 className="text-h3 text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <span className="text-body text-foreground">{children}</span>
    </div>
  );
}

async function Forbidden() {
  const t = await getTranslations("errors");
  return (
    <PageContainer>
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
