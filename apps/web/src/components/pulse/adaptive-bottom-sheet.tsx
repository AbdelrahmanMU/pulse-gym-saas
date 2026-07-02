"use client";

import { useRef, type ReactNode, type PointerEvent } from "react";
import { X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * PULSE AdaptiveBottomSheet (Catalog §12.1) — the one overlay primitive that renders as a
 * bottom-anchored, thumb-reachable sheet below `md` and a centered dialog ≥`md` (AP-3/4/7).
 * Built on the existing Radix `ui/sheet.tsx` (focus trap, Esc, scrim tap, focus-return —
 * the v1.1 overlay a11y, inherited not re-implemented). Identical content and actions on
 * both presentations (adaptive-parity, design-system-v1.2 §5.11).
 *
 * Dismiss paths: Esc · scrim tap · labeled close button · (mobile) drag-down on the handle.
 * Drag is an enhancement, never the only dismiss (§5.9); it needs no precision.
 */
export interface AdaptiveBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible sheet title (labels the dialog). */
  title: string;
  /** Optional trigger element (rendered via Radix asChild so focus-return is automatic). */
  trigger?: ReactNode;
  children: ReactNode;
  /** Optional pinned footer actions (e.g. Apply/Clear for the `filter` variant). */
  footer?: ReactNode;
}

/** Drag farther than this on the mobile handle and release → dismiss. */
const DRAG_CLOSE_PX = 80;

export function AdaptiveBottomSheet({
  open,
  onOpenChange,
  title,
  trigger,
  children,
  footer,
}: AdaptiveBottomSheetProps) {
  const startY = useRef<number | null>(null);

  function onHandlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    startY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onHandlePointerUp(event: PointerEvent<HTMLDivElement>): void {
    if (startY.current !== null && event.clientY - startY.current > DRAG_CLOSE_PX) {
      onOpenChange(false);
    }
    startY.current = null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent side="adaptive">
        {/* Mobile drag handle — visual affordance + coarse drag-down dismiss. */}
        <div
          aria-hidden
          className="flex touch-none justify-center py-2 md:hidden"
          onPointerDown={onHandlePointerDown}
          onPointerUp={onHandlePointerUp}
        >
          <span className="h-1.5 w-10 rounded-full bg-border-strong" />
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6 md:py-4">
          <SheetTitle className="text-h3 text-foreground">{title}</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X aria-hidden />
            </Button>
          </SheetClose>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-3 md:px-6">
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
