import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/pulse/page-container";
import { SkeletonPageHeader, SkeletonTable } from "@/components/pulse/loading-state";

/** Staff-list-shaped loading fallback (header → toolbar → rows; card list on mobile). */
export default async function StaffLoading() {
  const t = await getTranslations("common");
  return (
    <PageContainer>
      <div role="status" aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-8">
        <SkeletonPageHeader />
        <SkeletonTable />
      </div>
    </PageContainer>
  );
}
