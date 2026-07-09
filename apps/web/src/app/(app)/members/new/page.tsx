import Link from "next/link";
import { getTranslations } from "next-intl/server";
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

  const t = await getTranslations("members");
  return (
    <PageContainer width="narrow">
      <PageHeader title={t("newTitle")} subtitle={t("newSubtitle")} />
      <MemberForm action={createMemberAction} submitLabel={t("newTitle")} />
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
