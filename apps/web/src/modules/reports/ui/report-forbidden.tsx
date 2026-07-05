import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/pulse/page-container";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";

/**
 * Shared inline Forbidden for the report routes (Epic-8). A principal lacking `reports.view` sees this
 * instead of the report (the read model raises `AuthorizationError`, caught at the page). Mirrors the
 * memberships/notifications Forbidden pattern — a 403 shown inline, never a leaked 404/500.
 */
export async function ReportForbidden() {
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
