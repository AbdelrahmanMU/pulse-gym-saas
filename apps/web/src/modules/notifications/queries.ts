import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal } from "@pulse/types";
import { requireSession } from "@/lib/auth/guard";
import {
  getUnreadCount,
  listNotifications,
  type NotificationFilter,
  type NotificationView,
} from "./service";

/**
 * RSC read entry points for Notifications (Sprint-1 Epic-7). They **never generate** — generation is
 * a write and runs only through the Server Action (constitution: no writes during RSC render). The
 * page resolves its own session; the app-shell badge reuses the principal the `(app)` layout already
 * resolved, and returns `null` when the actor can't read notifications (the badge is then hidden).
 */
export async function loadNotifications(filter: NotificationFilter): Promise<NotificationView[]> {
  const principal = await requireSession();
  return listNotifications(principal, filter);
}

export async function loadUnreadCount(principal: AuthenticatedPrincipal): Promise<number | null> {
  if (!hasPermission(principal.permissions, PERMISSION_KEYS.NOTIFICATIONS_READ)) return null;
  return getUnreadCount(principal);
}
