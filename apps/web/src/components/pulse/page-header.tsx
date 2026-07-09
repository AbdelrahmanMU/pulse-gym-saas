import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PULSE PageHeader (Catalog §1, + §13 Rule E additions) — the page title zone. Renders the
 * page's single `<h1>` (`display-lg` token), an optional inline title accessory (e.g. a
 * status badge beside the name), an optional subtitle, and an optional action cluster.
 * Exactly one primary action; never more than one `<h1>` per page.
 */
export interface PageHeaderProps {
  title: string;
  /** Inline after the `<h1>` text — a StatusBadge, never plain colored text (§13). */
  titleAccessory?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  titleAccessory,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        {titleAccessory ? (
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-display-lg text-foreground">{title}</h1>
            {titleAccessory}
          </div>
        ) : (
          <h1 className="text-display-lg text-foreground">{title}</h1>
        )}
        {subtitle ? <div className="text-body text-muted-foreground">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
