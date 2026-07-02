"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./form-field";

/**
 * PULSE TextArea (Catalog §TextArea) — multi-line text entry. The textarea sibling of
 * TextInput: self-wires `id`/aria from the enclosing FormField context, uses the same token
 * styling and the global focus ring (never re-declared). Tokens only.
 */
export type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    className,
    rows = 4,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref,
) {
  const field = useFieldControl();
  return (
    <textarea
      ref={ref}
      id={field?.controlId}
      rows={rows}
      aria-describedby={ariaDescribedBy ?? field?.describedBy}
      aria-invalid={ariaInvalid ?? field?.hasError}
      required={props.required ?? field?.required}
      className={cn(
        // ≥16px below md so iOS Safari never focus-zooms (v1.2 §5.10); text-body ≥md.
        "w-full rounded-sm border bg-surface px-3 py-2 text-(length:--control-font-mobile) text-foreground placeholder:text-muted-foreground md:text-body",
        "disabled:pointer-events-none disabled:opacity-(--opacity-disabled)",
        field?.hasError ? "border-danger" : "border-border",
        className,
      )}
      {...props}
    />
  );
});
