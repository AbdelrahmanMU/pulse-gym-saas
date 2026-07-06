import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/pulse/page-container";
import {
  SkeletonKpiGrid,
  SkeletonPageHeader,
  SkeletonText,
} from "@/components/pulse/loading-state";

/**
 * Dashboard-shaped loading fallback (anti-CLS: header → KPI grid → the two
 * operational lists, in the page's own widths and order).
 */
export default async function DashboardLoading() {
  const t = await getTranslations("common");
  return (
    <PageContainer width="wide">
      <div role="status" aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-8">
        <SkeletonPageHeader />
        <SkeletonKpiGrid />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-surface p-6">
            <SkeletonText />
          </div>
          <div className="rounded-md border border-border bg-surface p-6">
            <SkeletonText />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
