"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * PULSE Checkbox (Catalog §9) — boolean choice with an inline label. Uses a real
 * `<input type="checkbox">` (native semantics, Space toggles, label clickable). Sized
 * for a comfortable touch target; brand accent when checked; global focus ring. Tokens
 * only. Renders its own label (not via FormField, which targets single-control fields).
 */
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, id, ...props },
  ref,
) {
  return (
    <label className={cn("flex items-center gap-2.5 text-body text-foreground", className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="size-5 rounded-xs border border-border-strong text-primary accent-primary"
        {...props}
      />
      {label}
    </label>
  );
});
