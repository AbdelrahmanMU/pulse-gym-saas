"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

/**
 * shadcn-idiom Sheet **primitive** (Radix Dialog), restyled to PULSE tokens. Internal
 * layer only (refinement R-1). Radix Dialog supplies the focus trap, Esc-to-close,
 * scrim/outside-click close, and focus-return-to-trigger that an accessible overlay
 * requires (Catalog AppShell §7 / §12.1).
 *
 * Sides:
 * - `left` (default) — the off-canvas nav drawer: rail colors, slides from the left at
 *   `--sidebar-w`.
 * - `adaptive` (v1.2) — the AdaptiveBottomSheet surface: bottom-anchored, top-rounded,
 *   safe-area padded sheet below `md`; a centered dialog ≥`md` (Catalog §12.1 / AP-4).
 *
 * Both sides sit at `--z-modal`, above the shared scrim (`--z-scrim`). The left panel
 * must NOT use `--z-drawer` (1200): it stacks below the scrim (1300), which then dims
 * the drawer's own surface below AA contrast (design review F1, 2026-07-02).
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

const SIDE_CLASSES = {
  left: "fixed inset-y-0 left-0 z-(--z-modal) flex w-(--sidebar-w) flex-col bg-rail-bg shadow-(--shadow-lg) focus:outline-none",
  adaptive: cn(
    "fixed z-(--z-modal) flex flex-col bg-surface shadow-(--shadow-lg) focus:outline-none",
    // <md: bottom sheet — full-width, top-rounded, capped height, safe-area padded.
    "inset-x-0 bottom-0 max-h-(--sheet-max-h) rounded-t-(--sheet-radius) pb-(--safe-bottom)",
    // ≥md: centered dialog — same content, standard modal shell (adaptive-parity, AP-4).
    "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border md:border-border md:pb-0",
  ),
} as const;

export type SheetSide = keyof typeof SIDE_CLASSES;

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: SheetSide }
>(({ className, children, side = "left", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-scrim) bg-rail-bg opacity-(--opacity-scrim)" />
    <DialogPrimitive.Content ref={ref} className={cn(SIDE_CLASSES[side], className)} {...props}>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";
