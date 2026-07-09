import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { formatMinorCurrency } from "@/lib/money";

/**
 * PULSE MetricValue (Catalog §MetricValue) — renders **every user-read number** in mono
 * tabular, with the full (non-abbreviated) value in accessible text. This is a **plain
 * Server Component on purpose**: money is formatted server-side so SSR and the client agree
 * (a `"use client"` formatter using the ambient locale risks a hydration mismatch). Minimal
 * variants — `number` and `currency` (percent/duration deferred until a story needs them).
 * Currency `value` is exact minor units (`bigint`/string); never a float.
 */
type Format = "number" | "currency";

const SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "text-body-sm",
  md: "text-body",
  lg: "text-h3",
};

export interface MetricValueProps {
  value: string | number | bigint;
  format?: Format;
  /** Required when `format="currency"` — the ISO-4217 code the minor-unit value is in. */
  currency?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MetricValue({
  value,
  format = "number",
  currency,
  size = "md",
  className,
}: MetricValueProps) {
  // `useLocale()` resolves in both Server and Client trees (this stays a sync component on
  // purpose — see the note above), so money formats per the active locale without a prop thread.
  const locale = useLocale();
  const text =
    format === "currency" && currency
      ? formatMinorCurrency(BigInt(value), currency, locale)
      : String(value);
  return <span className={cn("tabular", SIZE[size], className)}>{text}</span>;
}
