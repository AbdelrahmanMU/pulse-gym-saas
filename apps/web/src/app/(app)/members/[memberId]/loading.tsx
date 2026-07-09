import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/pulse/page-container";
import { Skeleton, SkeletonKpiGrid, SkeletonPageHeader } from "@/components/pulse/loading-state";

/**
 * Member-workspace-shaped loading fallback (header → Answer Strip → membership
 * rail cards, mirroring the W1/W2 zone order).
 */
export default async function MemberWorkspaceLoading() {
  const t = await getTranslations("common");
  return (
    <PageContainer>
      <div role="status" aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-8">
        <SkeletonPageHeader />
        <SkeletonKpiGrid count={3} />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
            >
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
