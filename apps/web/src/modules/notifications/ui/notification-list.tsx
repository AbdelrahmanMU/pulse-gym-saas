import Link from "next/link";
import { BellRing } from "lucide-react";
import { NotificationState } from "@pulse/db";
import { cn } from "@/lib/utils";
import { Button } from "@/components/pulse/button";
import { EmptyState } from "@/components/pulse/empty-state";
import type { NotificationFilter, NotificationView } from "../service";
import { markAllReadAction } from "../actions";
import { NotificationItem } from "./notification-item";

/**
 * NotificationCenter — `page` variant (Catalog §NotificationCenter), realized as module UI. Header
 * with an All / Unread filter (URL-param driven) and a Mark-all-read control (when the actor can
 * manage and unread exist), then the queue or an EmptyState. Unread are surfaced first by the query.
 * Composes catalogued components + tokens only; server-rendered (the actions are the only writes).
 */
export function NotificationList({
  notifications,
  filter,
  canManage,
}: {
  notifications: NotificationView[];
  filter: NotificationFilter;
  canManage: boolean;
}) {
  const hasUnread = notifications.some((n) => n.state === NotificationState.UNREAD);

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1" role="group" aria-label="Filter notifications">
          <FilterLink value="all" current={filter}>
            All
          </FilterLink>
          <FilterLink value="unread" current={filter}>
            Unread
          </FilterLink>
        </div>
        {canManage && hasUnread ? (
          <form action={markAllReadAction}>
            <Button type="submit" variant="outline" size="sm">
              Mark all read
            </Button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellRing aria-hidden />}
          title={filter === "unread" ? "You’re all caught up" : "No notifications"}
          description={
            filter === "unread"
              ? "There are no unread alerts right now."
              : "Expiry alerts appear here as memberships approach or pass their end date."
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} canManage={canManage} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterLink({
  value,
  current,
  children,
}: {
  value: NotificationFilter;
  current: NotificationFilter;
  children: string;
}) {
  const active = value === current;
  const href = value === "all" ? "/notifications" : "/notifications?filter=unread";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-sm px-3 py-1.5 text-body-sm font-medium transition-colors ease-standard",
        active
          ? "bg-surface-raised text-foreground"
          : "text-muted-foreground hover:bg-surface-raised",
      )}
    >
      {children}
    </Link>
  );
}
