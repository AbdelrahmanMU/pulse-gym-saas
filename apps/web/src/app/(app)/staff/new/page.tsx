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
import { createStaffAction } from "@/modules/staff/actions";
import { loadAssignableRoles } from "@/modules/staff/queries";
import { StaffForm } from "@/modules/staff/ui/staff-form";

/**
 * Add staff (Sprint-1 Epic-9). Gated by `staff.invite`. Creates a User + GymUser with an owner-set
 * temporary password (no email infra). On success the action redirects to the new staff member's
 * detail page. Routing only — the form + mutation live in the staff module (constitution §2).
 */
export default async function NewStaffPage() {
  try {
    await requirePermission(PERMISSION_KEYS.STAFF_INVITE);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const roleOptions = await loadAssignableRoles();
  const t = await getTranslations("staff");
  const ta = await getTranslations("actions");

  return (
    <PageContainer width="narrow">
      <PageHeader title={t("newTitle")} subtitle={t("newSubtitle")} />
      {roleOptions.length === 0 ? (
        <EmptyState title={t("noRolesTitle")} description={t("noRolesBody")} />
      ) : (
        <StaffForm
          action={createStaffAction}
          roleOptions={roleOptions}
          submitLabel={ta("addStaff")}
        />
      )}
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
