"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * PULSE Skeleton (Catalog §10) — a placeholder block matching content shape while loading.
 * `aria-hidden`; the awaited region carries `aria-busy`. Motion: the token-owned
 * `.skeleton` base (globals.css §5) applies the prescribed `pulse-shimmer` sweep only
 * under `prefers-reduced-motion: no-preference` — the static block is the mandated
 * fallback. RTL-aware (the sweep follows reading direction).
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

/**
 * Catalog §10 Skeleton variants — placeholder compositions that mirror the major
 * PULSE layouts (anti-CLS rule: a skeleton must match the shape it replaces).
 * Purely presentational (`aria-hidden` inherits from Skeleton); the route-level
 * loading region carries `role="status"`/`aria-busy`.
 */
const TEXT_WIDTHS = ["w-full", "w-5/6", "w-2/3", "w-4/5"] as const;

/** `text` variant — a paragraph-shaped stack of bars. */
export function SkeletonText({ lines = 4 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", TEXT_WIDTHS[i % TEXT_WIDTHS.length])} />
      ))}
    </div>
  );
}

/** Page title + subtitle — mirrors PageHeader. */
export function SkeletonPageHeader() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

/** `table-row` variant — a list/table region (toolbar + rows); reads as the AP-1 card list on mobile. */
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
      <Skeleton className="h-11 w-full max-w-xs" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

/** A form-shaped placeholder (labels + controls + the primary action). */
export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-6 rounded-md border border-border bg-surface p-6">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-full sm:w-40" />
    </div>
  );
}

/** `stat` variant — one KPI card (eyebrow + metric). */
export function SkeletonStat() {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-2/3" />
    </div>
  );
}

/** A KPIGrid-shaped set of `stat` skeletons (same responsive columns as KPIGrid). */
export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  );
}

/**
 * PULSE LoadingState (Catalog §10) — in-progress loading for a region/page. `skeleton`
 * (preferred — reduces perceived latency/CLS) mimics the awaited content; `spinner` shows
 * a labelled indicator. `role="status"` + `aria-busy` announce the busy region.
 */
export interface LoadingStateProps {
  variant?: "skeleton" | "spinner";
  label?: string;
  className?: string;
}

export function LoadingState({ variant = "skeleton", label, className }: LoadingStateProps) {
  const t = useTranslations("common");
  const text = label ?? t("loading");
  if (variant === "spinner") {
    return (
      <div
        role="status"
        aria-busy="true"
        className={cn(
          "flex items-center justify-center gap-3 py-16 text-muted-foreground",
          className,
        )}
      >
        <Loader2 aria-hidden className="size-5 animate-spin" />
        <span className="text-body">{text}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={text}
      className={cn(
        "flex flex-col gap-3 rounded-md border border-border bg-surface p-6",
        className,
      )}
    >
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
