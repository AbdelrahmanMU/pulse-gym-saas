"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { AdaptiveBottomSheet } from "./adaptive-bottom-sheet";
import { Button } from "./button";

/**
 * PULSE FilterSheet — the FilterBar's mobile presentation (Catalog §12.5 / AP-3): below
 * `md` the list filters move out of the toolbar into an AdaptiveBottomSheet behind a
 * "Filters" trigger carrying the active-filter count. Filters keep applying instantly on
 * change (URL-driven, same handlers as the inline controls); "Done" just dismisses.
 * Render this `md:hidden` alongside the `hidden md:flex` inline controls — same controls,
 * two presentations, one data path (adaptive-parity, v1.2 §5.11).
 */
export interface FilterSheetProps {
  /** Number of non-default filters currently applied (shown on the trigger). */
  activeCount: number;
  /** The filter controls (the same catalogued inputs the desktop toolbar renders inline). */
  children: ReactNode;
}

export function FilterSheet({ activeCount, children }: FilterSheetProps) {
  const [open, setOpen] = useState(false);
  const label = activeCount > 0 ? `Filters (${activeCount} active)` : "Filters";

  return (
    <div className="md:hidden">
      <AdaptiveBottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Filters"
        trigger={
          <Button variant="secondary" aria-label={label}>
            <SlidersHorizontal aria-hidden className="size-4" />
            Filters
            {activeCount > 0 ? <span className="tabular">({activeCount})</span> : null}
          </Button>
        }
        footer={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="flex flex-col gap-4">{children}</div>
      </AdaptiveBottomSheet>
    </div>
  );
}
