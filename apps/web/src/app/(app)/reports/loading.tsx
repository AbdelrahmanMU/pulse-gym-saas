import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/pulse/page-container";
import {
  SkeletonKpiGrid,
  SkeletonPageHeader,
  SkeletonTable,
} from "@/components/pulse/loading-state";

/**
 * Reports-shaped loading fallback (covers /reports and every report subpage:
 * header → summary stats → result table).
 */
export default async function ReportsLoading() {
  const t = await getTranslations("common");
  return (
    <PageContainer>
      <div role="status" aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-8">
        <SkeletonPageHeader />
        <SkeletonKpiGrid count={3} />
        <SkeletonTable rows={5} />
      </div>
    </PageContainer>
  );
}
