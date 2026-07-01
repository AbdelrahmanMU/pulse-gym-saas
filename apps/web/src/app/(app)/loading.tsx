import { PageContainer } from "@/components/pulse/page-container";
import { Skeleton } from "@/components/pulse/loading-state";

/**
 * Authenticated-segment loading fallback. Next renders this in the shell's `<main>` while
 * a route's server component resolves its data, so navigation gives immediate, low-CLS
 * feedback instead of a blank content area (the Sidebar + TopBar stay mounted — only the
 * page content suspends). A generic page shape (header + content block) that fits every
 * route; `role="status"`/`aria-busy` are carried by the region below. Tokens only.
 */
export default function AppLoading() {
  return (
    <PageContainer>
      <div role="status" aria-busy="true" aria-label="Loading…" className="flex flex-col gap-8">
        {/* Header block — title + subtitle */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        {/* Content block */}
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </PageContainer>
  );
}
