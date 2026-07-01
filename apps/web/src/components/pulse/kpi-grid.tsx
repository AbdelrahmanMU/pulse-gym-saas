import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PULSE KPIGrid (Catalog §3 Dashboard) — arrange StatCards in a count-agnostic responsive grid.
 * Source order = visual order (a11y). Reflows 4→3→2→1 by viewport via breakpoint column counts
 * (the token-compliance rule forbids arbitrary `[…]` classes, so CSS `auto-fit` is expressed as
 * responsive breakpoints — same reflow, no magic values). Layout only; tokens only.
 */
export function KPIGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
