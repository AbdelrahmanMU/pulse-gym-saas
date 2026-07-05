"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Client shell for the rail's expandable cards (catalog §13.3) — expansion state and the
 * disclosure a11y contract only. All card *content* (header slots, panels) is rendered on the
 * server and passed in, so money/status/date presentation stays server-formatted. Multiple
 * cards may be open at once (comparing two memberships is a real desk task, §D11); expansion
 * state is per-visit, never persisted.
 */
export function RailCardShell({
  defaultOpen = false,
  header,
  children,
  className,
}: {
  defaultOpen?: boolean;
  /** Server-rendered header row content (after the chevron). */
  header: ReactNode;
  /** Server-rendered panels. */
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();
  const ref = useRef<HTMLDivElement>(null);

  const toggle = (): void => {
    const next = !open;
    setOpen(next);
    // Keep the tapped header in view as the card grows — it must not "run away" (§D11).
    if (next) {
      requestAnimationFrame(() => ref.current?.scrollIntoView({ block: "nearest" }));
    }
  };

  return (
    <div ref={ref} className={className}>
      <h3 className="text-body text-foreground">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={toggle}
          className="flex min-h-11 w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-start"
        >
          {open ? (
            <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100"
            />
          )}
          {header}
        </button>
      </h3>
      <div id={regionId} hidden={!open} className="px-4 pb-4 ps-11">
        {children}
      </div>
    </div>
  );
}

/**
 * Progressive disclosure for long histories (§D2.1): older past cards stay out of the DOM's
 * initial story until asked for. Server renders the hidden group; this shell only gates it.
 */
export function ShowOlder({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("memberships");
  if (open) return <>{children}</>;
  return (
    <li className="py-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 px-4 text-body-sm text-accent-text hover:underline"
      >
        {t("showOlder", { count })}
      </button>
    </li>
  );
}
