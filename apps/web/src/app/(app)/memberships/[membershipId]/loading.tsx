import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/pulse/page-container";
import { SkeletonPageHeader, SkeletonText } from "@/components/pulse/loading-state";

/** Detail-shaped loading fallback (header → detail cards). */
export default async function MembershipDetailLoading() {
  const t = await getTranslations("common");
  return (
    <PageContainer>
      <div role="status" aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-8">
        <SkeletonPageHeader />
        <div className="rounded-md border border-border bg-surface p-6">
          <SkeletonText />
        </div>
        <div className="rounded-md border border-border bg-surface p-6">
          <SkeletonText lines={3} />
        </div>
      </div>
    </PageContainer>
  );
}
