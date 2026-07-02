"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./form-field";

/**
 * PULSE SelectInput (Catalog §9, `native` variant) — choose one option from a list.
 * Built on a native `<select>` (accessible, mobile-friendly, zero new dependency); the
 * `searchable` combobox variant is deferred (on-demand, Catalog §D). Self-wires id/aria
 * from FormField context. The chevron affordance distinguishes it from TextInput (audit
 * fix). Tokens only; global focus ring.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  options: SelectOption[];
  placeholder?: string;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  {
    className,
    options,
    placeholder,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref,
) {
  const field = useFieldControl();
  return (
    <div className="relative">
      <select
        ref={ref}
        id={field?.controlId}
        aria-describedby={ariaDescribedBy ?? field?.describedBy}
        aria-invalid={ariaInvalid ?? field?.hasError}
        required={props.required ?? field?.required}
        className={cn(
          // ≥16px below md so iOS Safari never focus-zooms (v1.2 §5.10); text-body ≥md.
          "h-11 w-full appearance-none rounded-sm border bg-surface pl-3 pr-10 text-(length:--control-font-mobile) text-foreground md:text-body",
          "disabled:pointer-events-none disabled:opacity-(--opacity-disabled)",
          field?.hasError ? "border-danger" : "border-border",
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
});
