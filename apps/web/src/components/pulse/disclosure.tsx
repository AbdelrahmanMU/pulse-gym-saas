"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PULSE Disclosure (Catalog §13.2) — the folded summary-card system for workspace zones. The
 * header (title + operational summary facts) is always visible; only *detail* folds. Default
 * state is breakpoint-dependent (folded under md, open at ≥md — reference data costs nothing
 * on desktop, D9/D12); an explicit user toggle always wins over the default. Expansion state
 * is per-visit, never persisted.
 *
 * A11y: WAI-ARIA disclosure — the toggle is a real `<button>` inside the `<h2>` with
 * `aria-expanded`/`aria-controls`; folded content is `hidden` (out of the tab order). The
 * whole header row (minus `headerAction`) is the toggle target (≥44-pt under md, v1.2 §5.4).
 */
const MD_QUERY = "(min-width: 48rem)"; // --breakpoint-md — the catalog's adaptive boundary

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(MD_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** SSR/first paint says "mobile" (folded); a desktop viewport opens on hydration. */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MD_QUERY).matches,
    () => false,
  );
}

export interface DisclosureProps {
  title: string;
  /** The always-visible header facts (the section's two most operational values). */
  summary?: ReactNode;
  /** Interactive element beside the toggle (e.g. an Edit link) — never nested inside it. */
  headerAction?: ReactNode;
  /** `"desktop"` (default): folded <md, open ≥md · `false`: folded everywhere · `true`: open. */
  defaultOpen?: boolean | "desktop";
  className?: string;
  children: ReactNode;
}

export function Disclosure({
  title,
  summary,
  headerAction,
  defaultOpen = "desktop",
  className,
  children,
}: DisclosureProps) {
  const regionId = useId();
  const isDesktop = useIsDesktop();
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  const open = userChoice ?? (defaultOpen === "desktop" ? isDesktop : defaultOpen);

  return (
    <section className={cn("rounded-md border border-border bg-surface", className)}>
      <div className="flex items-center gap-3 pr-4">
        <h2 className="min-w-0 flex-1 text-h3 text-foreground">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={regionId}
            onClick={() => setUserChoice(!open)}
            className="flex w-full min-w-0 items-center gap-2 py-3 pl-6 text-left md:py-4"
          >
            {open ? (
              <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="shrink-0">{title}</span>
            {summary ? (
              <span className="min-w-0 truncate text-body-sm font-normal text-muted-foreground">
                {summary}
              </span>
            ) : null}
          </button>
        </h2>
        {headerAction}
      </div>
      <div id={regionId} hidden={!open} className="px-6 pb-6">
        {children}
      </div>
    </section>
  );
}
