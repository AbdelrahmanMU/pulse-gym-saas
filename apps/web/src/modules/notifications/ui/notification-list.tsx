import Link from "next/link";
import { BellRing } from "lucide-react";
import { getTranslations } from "next-intl/server";
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
export async function NotificationList({
  notifications,
  filter,
  canManage,
}: {
  notifications: NotificationView[];
  filter: NotificationFilter;
  canManage: boolean;
}) {
  const t = await getTranslations("notifications");
  const hasUnread = notifications.some((n) => n.state === NotificationState.UNREAD);

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1" role="group" aria-label={t("filterAria")}>
          <FilterLink value="all" current={filter}>
            {t("filterAll")}
          </FilterLink>
          <FilterLink value="unread" current={filter}>
            {t("filterUnread")}
          </FilterLink>
        </div>
        {canManage && hasUnread ? (
          <form action={markAllReadAction}>
            <Button type="submit" variant="outline" size="sm">
              {t("markAllRead")}
            </Button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellRing aria-hidden />}
          title={filter === "unread" ? t("emptyUnreadTitle") : t("emptyAllTitle")}
          description={filter === "unread" ? t("emptyUnreadBody") : t("emptyAllBody")}
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
