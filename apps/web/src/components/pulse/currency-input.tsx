"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { currencySymbol, formatMinorPlain } from "@/lib/money";
import { useFieldControl } from "./form-field";

/**
 * PULSE CurrencyInput (Catalog §CurrencyInput) — the only money-entry control; never a
 * TextInput for money. It submits a **plain, unseparated major-unit string** and the server
 * is the single parse authority (`lib/money.parseAmountToMinor` → exact minor units), so
 * money is never a float and over-precision is rejected server-side as a field error. Light
 * client sanitization keeps the field to digits + one decimal point. Self-wires id/aria from
 * FormField. The currency symbol is resolved with a fixed locale for SSR/CSR determinism.
 */
function sanitize(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

export interface CurrencyInputProps {
  name: string;
  currency: string;
  /** Minor units (`bigint` as string) to prefill the field for edit. */
  defaultMinor?: string;
  className?: string;
}

export function CurrencyInput({ name, currency, defaultMinor, className }: CurrencyInputProps) {
  const field = useFieldControl();
  const initial =
    defaultMinor != null && defaultMinor !== ""
      ? formatMinorPlain(BigInt(defaultMinor), currency)
      : "";
  const [value, setValue] = useState(initial);
  const symbol = currencySymbol(currency, "en");

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-body-sm text-muted-foreground"
      >
        {symbol}
      </span>
      <input
        id={field?.controlId}
        name={name}
        type="text"
        inputMode="decimal"
        aria-describedby={field?.describedBy}
        aria-invalid={field?.hasError}
        required={field?.required}
        value={value}
        onChange={(e) => setValue(sanitize(e.target.value))}
        placeholder="0.00"
        className={cn(
          // ≥16px below md so iOS Safari never focus-zooms (v1.2 §5.10); text-body ≥md.
          "tabular h-11 w-full rounded-sm border bg-surface ps-9 pe-3 text-end text-(length:--control-font-mobile) text-foreground placeholder:text-muted-foreground md:text-body",
          "disabled:pointer-events-none disabled:opacity-(--opacity-disabled)",
          field?.hasError ? "border-danger" : "border-border",
          className,
        )}
      />
    </div>
  );
}
