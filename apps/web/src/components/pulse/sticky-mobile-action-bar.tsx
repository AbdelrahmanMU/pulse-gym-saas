import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PULSE StickyMobileActionBar (Catalog §12.3) — the primary mobile action pattern for
 * forms (submit/cancel) and detail pages (primary + one secondary). Below `md` the row
 * pins to the thumb zone via the `.actionbar-mobile` base style (sticky, surface bg,
 * safe-area padded — §5.3/§5.8); at ≥`md` it renders exactly like today's inline action
 * row (no pin, no visual change). Being in-flow (sticky, not fixed) it can never cover
 * content and needs no reserved padding; DOM/focus order stays after the content.
 *
 * Holds one primary + at most one secondary (§5.3); destructive actions stay behind
 * their confirm step and are never the default thumb control (§5.1).
 */
export interface StickyMobileActionBarProps {
  children: ReactNode;
  className?: string;
}

export function StickyMobileActionBar({ children, className }: StickyMobileActionBarProps) {
  return (
    <div
      className={cn(
        "actionbar-mobile flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6 max-md:pt-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
