"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PULSE FormField (Catalog §9) — the wrapper that binds a label, control, help text,
 * and validation error, and guarantees the accessibility contract:
 *   • `<label htmlFor>` ↔ control `id` association
 *   • required shown by a visible glyph **and** the word "required" (not colour alone)
 *   • `aria-describedby` → help/error; `aria-invalid` on the control when in error
 *
 * Wiring is automatic: FormField publishes `{ controlId, describedBy, hasError, required }`
 * via context; the control components (TextInput/SelectInput/Checkbox) consume it so
 * callers never hand-wire ids. Tokens only; focus ring is the global base layer.
 */
interface FieldContextValue {
  controlId: string;
  describedBy?: string;
  hasError: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Control components read this to self-wire id/aria. Returns null outside a FormField. */
export function useFieldControl(): FieldContextValue | null {
  return useContext(FieldContext);
}

export interface FormFieldProps {
  label: string;
  /** Form control(s) — a TextInput/SelectInput/Checkbox etc. */
  children: ReactNode;
  required?: boolean;
  help?: ReactNode;
  /** Validation error message; presence switches the field to its error presentation. */
  error?: ReactNode;
  className?: string;
}

export function FormField({
  label,
  children,
  required = false,
  help,
  error,
  className,
}: FormFieldProps) {
  const controlId = useId();
  const helpId = `${controlId}-help`;
  const errorId = `${controlId}-error`;
  const hasError = Boolean(error);
  const describedBy =
    [help ? helpId : null, hasError ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ controlId, describedBy, hasError, required }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={controlId} className="text-body-sm font-medium text-foreground">
          {label}
          {required ? (
            <span className="ml-1 text-muted-foreground">
              <span aria-hidden>*</span>
              <span className="sr-only">(required)</span>
            </span>
          ) : null}
        </label>
        {children}
        {help && !hasError ? (
          <p id={helpId} className="text-body-sm text-muted-foreground">
            {help}
          </p>
        ) : null}
        {hasError ? (
          <p id={errorId} className="text-body-sm text-danger-text">
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
