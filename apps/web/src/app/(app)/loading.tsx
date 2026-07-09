import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/pulse/page-container";
import { SkeletonPageHeader, SkeletonText } from "@/components/pulse/loading-state";

/**
 * Authenticated-segment loading fallback. Next renders this in the shell's `<main>` while
 * a route's server component resolves its data, so navigation gives immediate, low-CLS
 * feedback instead of a blank content area (the Sidebar + TopBar stay mounted — only the
 * page content suspends). The generic page shape for routes without a closer, route-shaped
 * `loading.tsx` (forms, settings, details); `role="status"`/`aria-busy` carried here.
 */
export default async function AppLoading() {
  const t = await getTranslations("common");
  return (
    <PageContainer>
      <div role="status" aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-8">
        <SkeletonPageHeader />
        <div className="rounded-md border border-border bg-surface p-6">
          <SkeletonText />
        </div>
      </div>
    </PageContainer>
  );
}
