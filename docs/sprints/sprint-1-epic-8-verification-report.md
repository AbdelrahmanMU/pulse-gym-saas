# Sprint 1 · Epic 8 — Operational Reports · Verification Report

**Status:** IMPLEMENTED + VERIFIED (Fast Delivery). **Not merged/tagged** — awaiting human acceptance.
**Schema/permission change:** none (`reports.view` already in the catalog). **New pattern:** none —
reuses the Epic-6 read-model-via-public-index composition and the existing lifecycle/ledger engines.

## What shipped
New `apps/web/src/modules/reports/**` (read-model + validation + queries + ui) composing existing
projections through their public indexes, gated by `reports.view`. Routes `(app)/reports` (hub) +
`/reports/{revenue,memberships,outstanding,expiring}`; permission-gated **Reports** nav item.

**Reused / extended home-module projections (no duplicated business calculation):**
- **payments** — new `getRevenueReport` (Today/Week/Month/Custom, reusing `sumRevenueInRange` +
  new pure `startOfIsoWeek`) and `getOutstandingBalanceReport` (price/paid/balance, reusing the
  extracted `loadOutstandingRows` + `summarizeLedger` — same "outstanding" definition as the dashboard).
- **memberships** — new `getExpiringReport` (fixed 7/30 cumulative buckets + all expired, reusing
  `deriveRow`); `getMembershipOverview.counts` extended with `cancelled`; `listMemberships` reused for
  the filtered list. All exposed via `index.ts`.

## Verification targets → evidence
| Target | Result | Evidence |
|---|---|---|
| **Revenue** | ✅ | Net revenue = ledger `Σ(PAYMENT) − Σ(VOID)` via the shared `sumRevenueInRange` (6 tests) over gym-tz day ranges. Buckets are period-to-date (week/month), consistent with `getRevenueSummary`; standard buckets load from `min(weekStart, monthStart)` (week-to-date can't undercount early in a month); custom range loaded separately. `startOfIsoWeek` +4 tests (Mon/mid-week/Sun/year-boundary). |
| **Membership counts** | ✅ | Counts from `getMembershipOverview` (lifecycle `deriveRow` per row) — **not** a stale `cachedStatus` groupBy — extended with `cancelled`. The 5 status cards + a filtered, paginated list via the reused `listMemberships`. |
| **Outstanding balance** | ✅ | Price/paid/balance per membership from `summarizeLedger` via the extracted shared `loadOutstandingRows`; identical exclusions to the dashboard widget (cancelled written-off + not-yet-started SCHEDULED excluded; ACTIVE/FROZEN/EXPIRED with a balance included). `getOutstandingBalances` behavior preserved (sort-desc + slice + count). |
| **Expiring report** | ✅ | Fixed **7/30** cumulative buckets (`within30 ⊇ within7`) + all expired, from derived remaining days (`deriveRow`) — distinct from the gym-configurable expiring-soon indicator (RPT-2). |
| **Read-model reuse** | ✅ | Reports compose **only** through `@/modules/memberships` and `@/modules/payments` public indexes; every value is derived in its home module (report UIs do zero math). No projection duplicated: revenue=`sumRevenueInRange`, balance=`summarizeLedger`, status/expiry=`deriveRow`. |
| **Architecture fitness** | ✅ | `architecture.test.ts` green: no cycles, no ui→db, **no cross-context** (proves reports→memberships/payments use only the public index). token-compliance + ui-layering + catalog-consistency + no-role-checks green. |
| **Authorization (by permission)** | ✅ **tested** | `reports/read-model.test.ts`: every report read model refuses a principal lacking `reports.view` (and a domain-read holder without `reports.view`) with `AuthorizationError`; each composed read further authorizes its own `memberships.read`/`payments.read`. Owner/Manager/Accountant hold all three. |
| **Client-bundle safety** | ✅ | Build compiles; report lists/tables are server components (membership status + money enums appear server-side only). Only the revenue custom-range form ships client JS (catalog TextInput). |
| **A11y** | ✅ | DataTable (scoped headers, tabular-mono numerics), `<time>` dates, MetricValue money, status via StatusBadge (icon/label/token, not colour alone), filter groups with `aria-current`, labelled date inputs (FormField). |

## Gate (all green)
`pnpm type-check` · `pnpm lint` (incl. all fitness eslint) · `pnpm --filter @pulse/web test` =
**178 tests** (+4 `startOfIsoWeek`, +5 revenue-range validation, +2 reports authorization) ·
`pnpm format:check` · `pnpm build` (all 5 `/reports*` routes emitted). Node 20.20.0 / Next 15.5.

## Demo checklist → how to exercise
- **Open Revenue Report** → `/reports/revenue` (Today/Week/Month cards).
- **Filter by Date Range** → set From/To, "Apply range" → `?from&to`, adds the Custom card.
- **Open Membership Report** → `/reports/memberships` (5 status cards + list).
- **Filter Membership Status** → status chips → `?status=ACTIVE|…` (list + pagination).
- **Open Outstanding Balance Report** → `/reports/outstanding` (Member/Membership/Price/Paid/Balance).
- **Open Expiring Membership Report** → `/reports/expiring` (within 7 / within 30 / already expired).

## Decisions flagged for human veto
1. **"This Week" = Monday-start ISO week, period-to-date** (through today) — consistent with the
   existing month-to-date. Single named helper `startOfIsoWeek`. (Sunday-start is the alternative.)
2. **Expiring "within 30" is cumulative** (includes within 7) and uses **fixed** 7/30 windows, per the
   literal spec + RPT-2 range-count semantics — not the gym-configurable expiring-soon indicator, not a
   disjoint 8–30 band.
3. **"Already expired" lists all expired memberships** (dashboard-consistent, includes renewed-then-
   expired predecessors) — a historical view, not the tail-only renewal-outreach set from Epic 7.
4. **Outstanding total is single-currency** (gym default) — valid in MVP where plan currency = gym
   default; a mixed-currency gym would need per-currency subtotals (future).
5. **No live DB integration for the new report projections** — correctness is inherited from the
   already-tested engines (`sumRevenueInRange`, `summarizeLedger`, `deriveRow`) plus the new pure
   helpers (`startOfIsoWeek`, `parseRevenueRange`) and the authorization deny tests (Epic-5/7 precedent).
6. **Reports are Owner-only in MVP** — `reports.view` is held by Owner and the dormant Manager/
   Accountant roles; by permission, never role.
7. **Known limitation — counts vs. filtered list can momentarily disagree.** The membership report's
   status **counts** use live derivation (`getMembershipOverview` → `deriveRow`), while the **filtered
   list** uses the `cachedStatus` accelerator (then re-derives each badge). A row that has silently
   time-drifted (e.g. `cachedStatus=ACTIVE` but past its end date, with no write to trigger reconcile)
   is counted under Expired yet appears under the Active filter with an "Expired" badge. This is
   inherited Epic-4/6 behavior (reconcile keeps it fresh in practice); it is only newly *juxtaposed*
   here. Not fixed — a derive-then-filter-in-memory list would diverge from the established
   `listMemberships` for no real gain.
