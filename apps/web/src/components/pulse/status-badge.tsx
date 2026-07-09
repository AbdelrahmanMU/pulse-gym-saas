import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PULSE StatusBadge (Catalog §StatusBadge) — the generic base for every status pill.
 * Maps a semantic tone → an accessible `*-text` token on its tint, with a dot/icon and a
 * text label. Accessibility contract (Design System v1.1 §7 / constitution §3): status is
 * conveyed by **icon + label + token**, never colour alone; contrast-correct `*-text`
 * tokens only. Display-only; tokens only.
 *
 * This is the canonical base — never create a new coloured pill outside it. Domain pills
 * (e.g. MemberStatusBadge) map their status vocabulary onto this component.
 */
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE: Record<StatusTone, string> = {
  success: "bg-success-tint text-success-text",
  warning: "bg-warning-tint text-warning-text",
  danger: "bg-danger-tint text-danger-text",
  info: "bg-info-tint text-info-text",
  neutral: "bg-surface-raised text-muted-foreground",
};

const SIZE: Record<"sm" | "md", string> = {
  sm: "gap-1 px-2 py-0.5 text-eyebrow",
  md: "gap-1.5 px-2.5 py-1 text-caption",
};

export interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  /** Optional leading icon (Lucide); always paired with the text label, never alone. */
  icon?: ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ tone, label, icon, size = "md", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs font-semibold uppercase tracking-wide",
        TONE[tone],
        SIZE[size],
        className,
      )}
    >
      {icon ? (
        <span aria-hidden className="[&_svg]:size-3.5">
          {icon}
        </span>
      ) : null}
      {label}
    </span>
  );
}
