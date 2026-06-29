"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

/**
 * shadcn-idiom Sheet **primitive** (Radix Dialog), restyled to PULSE tokens. Internal
 * layer only (refinement R-1). Radix Dialog supplies the focus trap, Esc-to-close,
 * scrim/outside-click close, and focus-return-to-trigger that an accessible off-canvas
 * drawer requires (Catalog AppShell §7). The scrim uses the always-dark rail color +
 * `--opacity-scrim`; the panel slides from the left at `--sidebar-w`.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-scrim) bg-rail-bg opacity-(--opacity-scrim)" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 left-0 z-(--z-drawer) flex w-(--sidebar-w) flex-col bg-rail-bg shadow-(--shadow-lg) focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";
