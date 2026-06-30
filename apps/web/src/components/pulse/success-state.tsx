import { type ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PULSE SuccessState (Catalog §10) — full-context success after a multi-step flow
 * (used by the gym-initialization onboarding to confirm "your gym is ready" before the
 * Dashboard). Success carried by icon + text; offers the logical next action(s). Calm,
 * centered. Tokens only; the heading conveys state (not colour alone).
 */
export interface SuccessStateProps {
  title: string;
  summary?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SuccessState({ title, summary, actions, className }: SuccessStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-success-tint text-success [&_svg]:size-6">
        <CircleCheck aria-hidden />
      </span>
      <div className="flex max-w-md flex-col gap-1">
        <h2 className="text-h2 text-foreground">{title}</h2>
        {summary ? <p className="text-body text-muted-foreground">{summary}</p> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
