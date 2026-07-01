import { NotificationType } from "@pulse/db";
import type { StatusTone } from "@/components/pulse/status-badge";

/**
 * Presentation helpers for Notifications (no business logic — that lives in `generation.ts` /
 * `service.ts`). Pure mapping of the notification type onto its label + StatusBadge tone; the icon
 * is chosen in the item component. Used by the server-rendered NotificationItem.
 */
export function notificationTypeLabel(type: NotificationType): string {
  return type === NotificationType.MEMBERSHIP_EXPIRING_SOON ? "Expiring soon" : "Expired";
}

export function notificationTone(type: NotificationType): StatusTone {
  return type === NotificationType.MEMBERSHIP_EXPIRING_SOON ? "warning" : "neutral";
}
