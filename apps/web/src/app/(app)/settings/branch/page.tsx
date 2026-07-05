import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { loadDefaultBranch } from "@/modules/gym/queries";
import { BranchForm } from "@/modules/gym/ui/branch-form";

/**
 * Branch settings page (Sprint-1 Epic-1). View gated by `branches.read`, save by
 * `branches.manage`. Configures the single seeded default branch (BRN-1 — no add-branch
 * in MVP). Inline Forbidden for principals without access.
 */
export default async function BranchSettingsPage() {
  try {
    await requirePermission(PERMISSION_KEYS.BRANCHES_READ);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const t = await getTranslations("settings");
  const branch = await loadDefaultBranch();
  return (
    <PageContainer width="narrow">
      <PageHeader title={t("branchTitle")} subtitle={t("branchSubtitle")} />
      <BranchForm initial={branch} />
    </PageContainer>
  );
}

async function Forbidden() {
  const t = await getTranslations("settings");
  return (
    <PageContainer width="narrow">
      <ErrorState
        variant="inline"
        title={t("gymForbiddenTitle")}
        description={t("branchForbiddenBody")}
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">{t("backToDashboard")}</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
