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
import { updateStaffAction } from "@/modules/staff/actions";
import { loadStaffMember } from "@/modules/staff/queries";
import type { StaffDetail } from "@/modules/staff/service";
import { StaffForm } from "@/modules/staff/ui/staff-form";

/**
 * Edit staff (Sprint-1 Epic-9). Gated by `staff.manage`. Edits the profile (name + phone); email is
 * identity and the role has its own control on the detail page. A cross-gym/unknown id surfaces as
 * 404. On success the action redirects back to the staff detail page. Routing only.
 */
export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ gymUserId: string }>;
}) {
  try {
    await requirePermission(PERMISSION_KEYS.STAFF_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const { gymUserId } = await params;
  let staff: StaffDetail;
  try {
    staff = await loadStaffMember(gymUserId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const t = await getTranslations("staff");

  return (
    <PageContainer width="narrow">
      <PageHeader title={t("editTitle")} subtitle={staff.displayName} />
      <StaffForm
        action={updateStaffAction}
        initial={staff}
        gymUserId={staff.id}
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
