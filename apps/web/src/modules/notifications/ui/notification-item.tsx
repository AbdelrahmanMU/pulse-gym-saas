import type { ReactNode } from "react";
import Link from "next/link";
import { Check, CircleOff, TriangleAlert, X } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { NotificationState, NotificationType } from "@pulse/db";
import { cn } from "@/lib/utils";
import { formatDate, toISODate } from "@/lib/format-date";
import { StatusBadge } from "@/components/pulse/status-badge";
import { Button } from "@/components/pulse/button";
import type { NotificationView } from "../service";
import { notificationTone } from "../format";
import { dismissAction, markReadAction } from "../actions";

/**
 * NotificationItem (Catalog §NotificationItem, realized as module UI) — one row of the staff queue:
 * a type badge (icon + label + token, never colour alone), the message, the generated date as
 * `<time>`, a link to the subject membership, and — when the actor holds `notifications.manage` —
 * Mark-read / Dismiss controls (server-action forms). The message is rendered locale-aware at
 * display time from `type` + member name + the alert's end date (Localization Authority D11); the
 * stored `notification.message` is the English source/audit copy. Display-only; tokens only.
 */
function typeIcon(type: NotificationType) {
  return type === NotificationType.MEMBERSHIP_EXPIRING_SOON ? <TriangleAlert /> : <CircleOff />;
}

export async function NotificationItem({
  notification,
  canManage,
}: {
  notification: NotificationView;
  canManage: boolean;
}) {
  const t = await getTranslations("notifications");
  const locale = await getLocale();
  const isUnread = notification.state === NotificationState.UNREAD;
  const isExpiringSoon = notification.type === NotificationType.MEMBERSHIP_EXPIRING_SOON;
  const typeLabel = isExpiringSoon ? t("typeExpiringSoon") : t("typeExpired");
  return (
    <li className="flex items-start justify-between gap-4 py-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <StatusBadge
            tone={notificationTone(notification.type)}
            label={typeLabel}
            icon={typeIcon(notification.type)}
            size="sm"
          />
          {isUnread ? <StatusBadge tone="info" label={t("new")} size="sm" /> : null}
        </div>
        <p className={cn("text-body", isUnread ? "text-foreground" : "text-muted-foreground")}>
          {t.rich(isExpiringSoon ? "msgExpiringSoon" : "msgExpired", {
            name: () => <span dir="auto">{notification.memberName}</span>,
            plan: notification.planName,
            date: (): ReactNode => (
              <time dateTime={notification.effectiveEndDate} className="tabular">
                {formatDate(notification.effectiveEndDate, locale, "iso")}
              </time>
            ),
          })}
        </p>
        <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <time dateTime={toISODate(notification.generatedAt)} className="tabular">
            {formatDate(notification.generatedAt, locale, "iso")}
          </time>
          <span aria-hidden>·</span>
          <Link
            href={`/memberships/${notification.membershipId}`}
            className="hover:text-accent-text focus-visible:text-accent-text"
          >
            {t("viewMembership")}
          </Link>
        </div>
      </div>

      {canManage ? (
        <div className="flex shrink-0 items-center gap-1">
          {isUnread ? (
            <form action={markReadAction}>
              <input type="hidden" name="id" value={notification.id} />
              <Button type="submit" variant="ghost" size="sm">
                <Check aria-hidden /> {t("markRead")}
              </Button>
            </form>
          ) : null}
          <form action={dismissAction}>
            <input type="hidden" name="id" value={notification.id} />
            <Button type="submit" variant="ghost" size="sm">
              <X aria-hidden /> {t("dismiss")}
            </Button>
          </form>
        </div>
      ) : null}
    </li>
  );
}
