import { NavGroups, type NavGroupDef } from "./nav";

/**
 * PULSE Sidebar (Catalog §1) — the navigation rail's *content* (brand block + Nav). It
 * is purely presentational; AppShell positions it as a persistent rail (≥lg) or as the
 * off-canvas drawer panel (<lg). Uses the dark rail roles in both themes. The brand mark
 * is a decorative volt block (brand-as-accent, allowed); the "PULSE" wordmark is neutral
 * rail text — **brand is never used as readable text** (Design System §2).
 *
 * BranchSwitcher and the user/account block are deferred (refinement R-2 — no data/feature
 * yet); the user menu lives in the TopBar for the minimal shell.
 */
export function Sidebar({ groups }: { groups: readonly NavGroupDef[] }) {
  return (
    // The brand block lives INSIDE the nav landmark so all rail content is contained
    // (axe `region`); the rail is the single Primary navigation.
    <nav aria-label="Primary" className="flex h-full flex-col bg-rail-bg">
      {/* px-6 puts the brand mark on the optical left line the nav icons and eyebrows share (design review F3, 2026-07-02). */}
      <div className="flex h-(--topbar-h) shrink-0 items-center gap-2 px-6">
        <span aria-hidden className="size-6 rounded-sm bg-primary" />
        <span className="font-display text-h3 font-semibold text-rail-fg">PULSE</span>
      </div>
      <NavGroups groups={groups} />
    </nav>
  );
}
