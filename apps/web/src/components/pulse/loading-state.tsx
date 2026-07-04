"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * PULSE Skeleton (Catalog §10) — a placeholder block matching content shape while loading.
 * `aria-hidden`; the awaited region carries `aria-busy`. Motion: `animate-pulse` is
 * neutralized to a static block under `prefers-reduced-motion` by the base layer
 * (globals.css §4) — the mandated static fallback.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-sm bg-surface-raised", className)} />
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
