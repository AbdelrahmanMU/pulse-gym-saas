import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PULSE AnswerStrip (Catalog §13.1) — the member workspace's fixed page-top zone: identity ·
 * coverage · money · ONE computed action, in that order, for every member (design authority
 * §D3). Layout + reflow only: every line's content is composed by the page from module-owned
 * reads/badges; the strip never computes, fetches, or interprets.
 *
 * Hard budget (frozen): 3 facts + 1 action. An absent slot is an absent line — never a blank
 * placeholder. Mobile stacks the four lines; ≥lg reflows to two visual rows (identity +
 * coverage left, money + action right-aligned) with the same DOM order (§D12). The strip is
 * **not sticky** at any breakpoint (one-sticky rule §D3.3) — the page mirrors the action into
 * the StickyMobileActionBar.
 */
export interface AnswerStripProps {
  /** L1 — hosts the page's only `<h1>` (PageHeader) with badge accessory + trainer/tenure meta. */
  identity: ReactNode;
  /** L2 — the coverage line (the largest line on the page). */
  coverage?: ReactNode;
  /** L3 — the one aggregate money fact (absent without `payments.read`). */
  money?: ReactNode;
  /** L4 — the ONE computed primary action (absent in the calm state — calm is designed). */
  action?: ReactNode;
  className?: string;
}

export function AnswerStrip({ identity, coverage, money, action, className }: AnswerStripProps) {
  return (
    <div className={cn("mb-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6", className)}>
      <div className="flex flex-col gap-2">
        {identity}
        {coverage ? <div className="text-h3 text-foreground">{coverage}</div> : null}
      </div>
      {money || action ? (
        <div className="mt-4 flex flex-col gap-3 lg:mt-0 lg:items-end">
          {money ? <div className="text-body text-foreground">{money}</div> : null}
          {action ? <div className="flex">{action}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
