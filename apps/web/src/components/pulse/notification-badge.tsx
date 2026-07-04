import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PULSE NotificationBadge (Catalog §NotificationBadge) — overlays an unread count on a host element
 * (a bell, a nav item, a tab). Hidden at zero (never renders "0"); caps at `max` as "N+". The count
 * is `aria-hidden` — the **host** supplies the accessible name (e.g. the bell link's
 * `aria-label="Notifications, 3 unread"`), so meaning is never conveyed by the badge colour alone.
 * Display-only; tokens only.
 */
export interface NotificationBadgeProps {
  count: number;
  /** The host the badge overlays (e.g. a bell icon). */
  children: ReactNode;
  max?: number;
  className?: string;
}

export function NotificationBadge({ count, children, max = 9, className }: NotificationBadgeProps) {
  const show = count > 0;
  const display = count > max ? `${max}+` : String(count);
  return (
    <span className={cn("relative inline-flex", className)}>
      {children}
      {show ? (
        <span
          aria-hidden
          className="absolute -top-1 -end-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-eyebrow font-semibold tabular text-primary-foreground"
        >
          {display}
        </span>
      ) : null}
    </span>
  );
}
