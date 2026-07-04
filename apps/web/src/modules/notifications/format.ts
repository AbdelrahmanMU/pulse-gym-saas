import { NotificationType } from "@pulse/db";
import type { StatusTone } from "@/components/pulse/status-badge";

/**
 * Presentation helper for Notifications (no business logic — that lives in `generation.ts` /
 * `service.ts`). Maps the notification type onto its StatusBadge tone; the label is localized in
 * the server-rendered NotificationItem (getTranslations) and the icon is chosen there too.
 */
export function notificationTone(type: NotificationType): StatusTone {
  return type === NotificationType.MEMBERSHIP_EXPIRING_SOON ? "warning" : "neutral";
}
