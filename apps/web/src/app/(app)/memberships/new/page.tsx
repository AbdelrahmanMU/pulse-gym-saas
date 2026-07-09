import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { EmptyState } from "@/components/pulse/empty-state";
import { Button } from "@/components/pulse/button";
import { loadSellableMembers, loadSellablePlans } from "@/modules/memberships/queries";
import { MembershipForm } from "@/modules/memberships/ui/membership-form";

/**
 * Sell-a-membership page (Sprint-1 Epic-4). Gated by `memberships.create`. Loads the gym's
 * active members + active plans for the picklists; a `?memberId=` query preselects the member
 * (entry from a member profile). Routing only — the mutation lives in the memberships module.
 */
export default async function NewMembershipPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    await requirePermission(PERMISSION_KEYS.MEMBERSHIPS_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const [members, plans] = await Promise.all([loadSellableMembers(), loadSellablePlans()]);
  const sp = await searchParams;
  const defaultMemberId = typeof sp.memberId === "string" ? sp.memberId : undefined;

  const t = await getTranslations("memberships");
  const ta = await getTranslations("actions");

  if (plans.length === 0 || members.length === 0) {
    return (
      <PageContainer>
        <PageHeader title={t("sellTitle")} />
        <EmptyState
          title={plans.length === 0 ? t("noActivePlans") : t("noActiveMembers")}
          description={plans.length === 0 ? t("noActivePlansBody") : t("noActiveMembersBody")}
          action={
            <Button asChild>
              <Link href={plans.length === 0 ? "/plans/new" : "/members/new"}>
                {plans.length === 0 ? ta("addPlan") : ta("addMember")}
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title={t("sellTitle")} subtitle={t("sellSubtitle")} />
      <MembershipForm members={members} plans={plans} defaultMemberId={defaultMemberId} />
    </PageContainer>
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
