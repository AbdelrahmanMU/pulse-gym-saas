import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PULSE EmptyState (Catalog §4) — communicates a section has no data **yet** and guides
 * the first action. Quiet, generously spaced, muted. Distinct from NoResultsState
 * (filtered-empty). The heading conveys the state; the CTA is a real button/link passed
 * via `action`.
 */
export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-raised text-muted-foreground [&_svg]:size-6">
        {icon ?? <Inbox aria-hidden />}
      </span>
      <div className="flex max-w-md flex-col gap-1">
        <h2 className="text-h2 text-foreground">{title}</h2>
        {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
      </div>
      {action ? (
        <div className="flex flex-wrap items-center justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}
