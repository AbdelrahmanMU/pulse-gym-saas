import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PULSE ErrorState (Catalog §10) — full-context error / failed-load with a recovery path.
 * Danger is carried by **icon + text**, never color alone; copy stays calm. The danger
 * solid sits on the danger tint for the icon (icons may use the solid; only *text* uses
 * the `*-text` token). `role="alert"`. Presentational — the caller supplies the recovery
 * control via `action` (the error boundary passes a "Try again" button; the 403 view
 * passes a "Back" link), so this renders in both Server and Client trees.
 *
 * The correlation reference is folded into `description` by the caller (decision D-4.4) —
 * there is no separate reference prop, so the Catalog contract is unchanged.
 */
export interface ErrorStateProps {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  variant?: "page" | "inline";
  className?: string;
}

export function ErrorState({
  title,
  description,
  action,
  variant = "page",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 text-center",
        variant === "page" ? "py-16" : "py-10",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-danger-tint text-danger [&_svg]:size-6">
        <TriangleAlert aria-hidden />
      </span>
      <div className="flex max-w-md flex-col gap-1">
        <h2 className="text-h2 text-foreground">{title}</h2>
        <p className="text-body text-muted-foreground">{description}</p>
      </div>
      {action ? (
        <div className="flex flex-wrap items-center justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}
