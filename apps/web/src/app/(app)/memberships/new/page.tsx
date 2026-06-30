import Link from "next/link";
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

  if (plans.length === 0 || members.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="Sell membership" />
        <EmptyState
          title={plans.length === 0 ? "No active plans" : "No active members"}
          description={
            plans.length === 0
              ? "Create an active plan before selling a membership."
              : "Add a member before selling a membership."
          }
          action={
            <Button asChild>
              <Link href={plans.length === 0 ? "/plans/new" : "/members/new"}>
                {plans.length === 0 ? "Add plan" : "Add member"}
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Sell membership"
        subtitle="Grant a member access by selling them a plan."
      />
      <MembershipForm members={members} plans={plans} defaultMemberId={defaultMemberId} />
    </PageContainer>
  );
}

function Forbidden() {
  return (
    <PageContainer>
      <ErrorState
        variant="inline"
        title="Access denied"
        description="You don't have permission to sell memberships. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/memberships">Back to memberships</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
