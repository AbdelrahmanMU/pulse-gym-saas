import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/pulse/page-container";
import { Skeleton, SkeletonPageHeader } from "@/components/pulse/loading-state";

/** Notifications-shaped loading fallback (header → stacked notification cards). */
export default async function NotificationsLoading() {
  const t = await getTranslations("common");
  return (
    <PageContainer>
      <div role="status" aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-8">
        <SkeletonPageHeader />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
            >
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
