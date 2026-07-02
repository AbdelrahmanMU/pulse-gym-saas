"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./form-field";

/**
 * PULSE TextInput (Catalog §9) — single-line text entry. Self-wires `id` and aria
 * (`aria-describedby`/`aria-invalid`) from the enclosing FormField context, so a bare
 * input is never placed without label association. Control height = `--control-h`
 * (`h-11`); focus ring is the global base layer (never re-declared). Tokens only.
 */
export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    className,
    type = "text",
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref,
) {
  const field = useFieldControl();
  return (
    <input
      ref={ref}
      type={type}
      id={field?.controlId}
      aria-describedby={ariaDescribedBy ?? field?.describedBy}
      aria-invalid={ariaInvalid ?? field?.hasError}
      required={props.required ?? field?.required}
      className={cn(
        // ≥16px below md so iOS Safari never focus-zooms (v1.2 §5.10); text-body ≥md.
        "h-11 w-full rounded-sm border bg-surface px-3 text-(length:--control-font-mobile) text-foreground placeholder:text-muted-foreground md:text-body",
        "disabled:pointer-events-none disabled:opacity-(--opacity-disabled)",
        field?.hasError ? "border-danger" : "border-border",
        className,
      )}
      {...props}
    />
  );
});
