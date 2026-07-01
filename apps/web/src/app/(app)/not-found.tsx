import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { PageContainer } from "@/components/pulse/page-container";
import { EmptyState } from "@/components/pulse/empty-state";
import { Button } from "@/components/pulse/button";

/**
 * Authenticated-segment not-found boundary. Renders when a query/service throws
 * {@link NotFoundError} and the page maps it via `notFound()` — a missing record, or a
 * cross-tenant id disguised as absent (never confirms another gym's record exists;
 * error-handling.md). Rendered inside the `(app)` layout, so it appears within the app
 * shell (Sidebar + TopBar) rather than the bare framework 404, using the Catalog
 * {@link EmptyState} + tokens only.
 */
export default function AppNotFound() {
  return (
    <PageContainer>
      <EmptyState
        icon={<FileQuestion aria-hidden />}
        title="We couldn't find that"
        description="The page or record you're looking for doesn't exist, or you no longer have access to it."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
