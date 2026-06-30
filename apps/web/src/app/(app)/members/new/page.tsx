import Link from "next/link";
import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { createMemberAction } from "@/modules/members/actions";
import { MemberForm } from "@/modules/members/ui/member-form";

/**
 * Add member (Sprint-1 Epic-2). Gated by `members.create`. On success the action redirects
 * to the new member's profile. Routing only — the form + mutation live in the members
 * module (constitution §2).
 */
export default async function NewMemberPage() {
  try {
    await requirePermission(PERMISSION_KEYS.MEMBERS_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  return (
    <PageContainer width="narrow">
      <PageHeader title="Add member" subtitle="Register a new member of your gym." />
      <MemberForm action={createMemberAction} submitLabel="Add member" />
    </PageContainer>
  );
}

function Forbidden() {
  return (
    <PageContainer width="narrow">
      <ErrorState
        variant="inline"
        title="Access denied"
        description="You don't have permission to add members. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/members">Back to members</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
