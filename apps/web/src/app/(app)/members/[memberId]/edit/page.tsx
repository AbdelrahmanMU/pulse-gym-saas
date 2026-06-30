import Link from "next/link";
import { notFound } from "next/navigation";
import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { updateMemberAction } from "@/modules/members/actions";
import { loadMember } from "@/modules/members/queries";
import type { MemberDetail } from "@/modules/members/service";
import { MemberForm } from "@/modules/members/ui/member-form";

/**
 * Edit member (Sprint-1 Epic-2). Gated by `members.update`. On success the action redirects
 * back to the member's profile. A cross-gym/unknown id surfaces as 404. Routing only.
 */
export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  try {
    await requirePermission(PERMISSION_KEYS.MEMBERS_UPDATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const { memberId } = await params;
  let member: MemberDetail;
  try {
    member = await loadMember(memberId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <PageContainer width="narrow">
      <PageHeader title="Edit member" subtitle={member.fullName} />
      <MemberForm
        action={updateMemberAction}
        initial={member}
        memberId={member.id}
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
        description="You don't have permission to edit members. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/members">Back to members</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
