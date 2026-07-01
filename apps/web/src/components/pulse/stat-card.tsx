import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MetricValue } from "@/components/pulse/metric-value";

/**
 * PULSE StatCard (Catalog §3 Dashboard) — display a single KPI with context. Anatomy: eyebrow
 * label · MetricValue (mono tabular) · optional hint line, with the signature **3px brand left
 * accent-bar** (`--border-accent`; brand is never readable text — constitution §3). An optional
 * `href` makes the whole card a navigable link to the filtered source list (focus ring is the
 * global base layer). Plain Server Component — money/counts are formatted server-side (no client
 * bundle, SSR/CSR agree). Delta/sparkline variants are deferred (no source data yet — YAGNI).
 */
export interface StatCardProps {
  label: string;
  value: string | number | bigint;
  format?: "number" | "currency";
  /** Required when `format="currency"` — the ISO-4217 code the minor-unit value is in. */
  currency?: string;
  icon?: ReactNode;
  /** Optional context line under the value (e.g. "next 7 days"). */
  hint?: string;
  /** When set, the whole card navigates to the filtered source list. */
  href?: string;
}

export function StatCard({ label, value, format, currency, icon, hint, href }: StatCardProps) {
  const body = (
    <>
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-(--border-accent) rounded-l-md bg-brand-500"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow text-muted-foreground">{label}</span>
        {icon ? (
          <span aria-hidden className="text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
      </div>
      <MetricValue value={value} format={format} currency={currency} className="text-metric" />
      {hint ? <span className="text-body-sm text-muted-foreground">{hint}</span> : null}
    </>
  );

  const base =
    "relative flex flex-col gap-2 overflow-hidden rounded-md border border-border bg-surface p-5 pl-6";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised",
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={base}>{body}</div>;
}
