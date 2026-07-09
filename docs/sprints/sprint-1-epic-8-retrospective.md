# Sprint 1 · Epic 8 — Operational Reports · Retrospective

1. **"Reuse, don't recompute" was fully achievable — reports are pure composition.** Every number
   traces to an existing, tested engine: revenue → `sumRevenueInRange`, balance → `summarizeLedger`,
   status/expiry → `deriveRow`. The reports module holds no business math; it composes home-module
   projections through their public `index` (the Epic-6 pattern), and the `no-cross-context` fitness
   test proved the seam clean.

2. **Extend the home projection, don't fork it.** Missing pieces went into their owning module —
   `cancelled` added to `getMembershipOverview.counts`; a shared `loadOutstandingRows` extracted so the
   dashboard widget and the report share one "outstanding" definition; `getRevenueReport`/
   `getExpiringReport` beside their engines. New reusable read models, never logic in report pages.

3. **The two ambiguous requirements were resolved by consistency, not preference.** "This Week" mirrors
   the existing month-to-date (period-to-date, Monday-ISO); "within 30" is cumulative per RPT-2's
   range-count definition. Both flagged — but chosen to match the codebase/docs, not a coin flip. The
   advisor's tie-breakers (consistency with MTD; literal RPT-2) kept me from the "tidier" divergent
   readings (rolling window, disjoint 8–30 band).

4. **`cachedStatus` is a trap for count reports.** Counting via a `groupBy(cachedStatus)` would be
   simpler and wrong — the cache drifts until re-derivation. Reusing `deriveRow` (per-row, date-only)
   keeps the report honest. Same reason the expiring buckets derive remaining days rather than
   range-querying `cachedEffectiveEndDate`.

5. **Server-render the tables, and the enum trap never fires.** Report lists show membership-status and
   money enums; keeping them server components (only the revenue date form is client) sidestepped the
   `@pulse/db`-into-client-bundle build failure from Epics 4/5/7 by construction. Gaps carried honestly:
   no live DB integration for the new projections (correctness inherited from tested engines; authz
   deny tested), and reports are Owner-only until more roles are activated.
