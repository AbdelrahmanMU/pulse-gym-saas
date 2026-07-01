import Link from "next/link";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { loadNotifications } from "@/modules/notifications/queries";
import type { NotificationFilter } from "@/modules/notifications/service";
import { NotificationList } from "@/modules/notifications/ui/notification-list";
import { GenerateOnOpen } from "@/modules/notifications/ui/generate-on-open";

/**
 * Notifications (Sprint-1 Epic-7). View gated by `notifications.read`; a principal lacking it sees
 * the inline Forbidden ErrorState. Generation runs via the {@link GenerateOnOpen} client trigger (a
 * Server Action) — never in this RSC read. The All/Unread filter is URL-param driven and handed to
 * the module query, which authorizes + scopes by gym. Routing only.
 */
type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let principal;
  try {
    principal = await requirePermission(PERMISSION_KEYS.NOTIFICATIONS_READ);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const sp = await searchParams;
  const filter: NotificationFilter = first(sp.filter) === "unread" ? "unread" : "all";
  const notifications = await loadNotifications(filter);
  const canManage = hasPermission(principal.permissions, PERMISSION_KEYS.NOTIFICATIONS_MANAGE);

  return (
    <PageContainer>
      <PageHeader
        title="Notifications"
        subtitle="Membership expiry alerts for your gym — read and clear them to keep the queue tidy."
      />
      <GenerateOnOpen />
      <NotificationList notifications={notifications} filter={filter} canManage={canManage} />
    </PageContainer>
  );
}

function Forbidden() {
  return (
    <PageContainer>
      <ErrorState
        variant="inline"
        title="Access denied"
        description="You don’t have permission to view notifications. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
