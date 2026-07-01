# Sprint 1 · Epic 6 — Operations Dashboard · Session Summary

> Brief: `sprint-1-epic-6-implementation-brief.md`. This is the **verification report + retrospective**. Scope, decisions and interpretation flags live in the brief (a fact lives in one place).

## What shipped

- **Dashboard Read Model** — `modules/dashboard/{read-model,queries}.ts` — the single source the dashboard reads, composing the other contexts **only via their public `index.ts` entries**.
- **New derived reads in home modules** (no UI math): `memberships.getMembershipOverview` (status counts + expiring/expired lists via the existing `deriveRow`), `payments.getRevenueSummary` + `payments.getOutstandingBalances` (via `summarizeLedger` + the new pure `revenue.ts`), `members.listRecentMembers`.
- **New public `index.ts`** for members / memberships / payments (first module→module composition).
- **Catalog components** — `components/pulse/{stat-card,kpi-grid}.tsx` (StatCard + KPIGrid, to catalog §3 spec).
- **Rebuilt `/dashboard`** — KPI band, four operational lists, quick actions — fully server-rendered.
- **Refresh** — `revalidatePath("/dashboard")` added to payment record/void, membership create/renew/upgrade/freeze/resume/cancel, and member create.
- `payments/revenue.test.ts` (6 pure tests).

## Verification Report

**KPI Verification** — Active / Expiring Soon / Expired / Frozen / Scheduled are derived membership-status counts (re-derived per row via the same `deriveRow` the list uses — never trusted raw from `cached_status`); Revenue Today / This Month are ledger-derived. All rendered via the catalogued StatCard/MetricValue; the page performs no calculation.

**Read Model Verification** — `getDashboardData` is the only source the page reads. It composes `@/modules/memberships`, `@/modules/payments`, `@/modules/members` (bare-directory → `index.ts`) and `Promise.all`s them under one shared `IClock`. No Prisma access and no business math in `app/` or in any UI component.

**Dashboard Navigation Verification** — Every KPI status card deep-links to the filtered memberships list; every list row links to its membership/member detail; quick actions link to add-member / sell-membership / record-payment, each shown by permission. Navigation only — no duplicated business logic.

**Outstanding Balance Verification** — Derived per membership as `snapshotPrice − summarizeLedger(...)`, included when `remaining > 0`; **CANCELLED and SCHEDULED excluded** (written off / not-yet-started future period — via immutable `cancelledAt` + the `cached_status` accelerator, so an activated renewal now ACTIVE still shows), ACTIVE / FROZEN / EXPIRED included; never stored. Reuses the Epic-5 ledger sign authority.

**Expiring Membership Verification** — Expiring Soon = ACTIVE rows flagged `isExpiringSoon` by the lifecycle engine (gym-tz window), sorted most-urgent first; Expired list sorted most-recently-ended first. Both from `getMembershipOverview`.

**Revenue Verification** — `sumRevenueInRange` filters entries by gym-tz `receivedOn` then delegates the signed sum to `summarizeLedger(0n, …)` — one sign authority, exact bigint, never a float. Today ⊆ Month-to-date; a void nets its period and can go negative (pinned by tests, incl. boundaries).

**Responsive Verification** — KPIGrid reflows 4→3→2→1 (`sm`/`lg`/`xl` breakpoints); lists stack 2→1 (`lg:grid-cols-2`); `PageContainer width="wide"`. Mobile: cards readable, lists scrollable, no fixed widths. Build clean.

**Accessibility Verification** — Single `<h1>` (PageHeader) inside the shell `<main id="main-content">` (skip-nav target) + `<nav aria-label="Primary">`; each panel is a `<section>` with an `<h2>`; lists are `<ul>/<li>`; dates use `<time datetime>`; decorative icons `aria-hidden` and always paired with a text label; links/cards are keyboard-focusable using the global 2px focus ring (source order = visual order). Token-compliance + ui-layering fitness green.

**Architecture Fitness Verification** — `fitness/architecture.test.ts` green: no cycles, no package→app, no ui→db, **no cross-context imports** — the dashboard composes other contexts only through their `index` entries (the pattern the rule rewards). Fully server-rendered → no `@pulse/db` in any client bundle.

**Gates:** type-check ✅ · lint + all fitness ✅ · prettier ✅ · build ✅ · tests **146 passed (22 files)** ✅.

## Demo Checklist

1. **Login** → land on `/dashboard` (first-run owners route to onboarding first).
2. **Dashboard loads** — KPI band + four lists + quick actions render.
3. **KPIs display correctly** — counts + Revenue Today/MTD derived from live data.
4. **Open Expiring Member** — click an Expiring Soon row → membership detail.
5. **Renew Membership** — lifecycle control (Epic-4) on that page.
6. **Record Payment** — Billing form (Epic-5) on that page.
7. **Return to Dashboard** — soft-nav back.
8. **KPI updates** — status counts reflect the renewal (`revalidatePath("/dashboard")`).
9. **Outstanding Balance updates** — the new payment reduces the balance / drops the row.
10. **Revenue updates** — Revenue Today/MTD reflect the recorded payment.

## Retrospective (≤5)

- **The `no-cross-context` fitness rule turned "compose the modules" into a real design decision.** The clean answer was the public-`index.ts` pattern the rule explicitly rewards (bare-directory imports) — a genuinely new-but-intended pattern, now established for all future cross-module reads.
- **"Read model in the home module, thin composition in the dashboard"** kept the UI math-free and avoided duplicating derivation: revenue reuses `summarizeLedger`, counts reuse `deriveRow`, standing/balance reuse the Epic-5 ledger. Zero new money logic.
- **Refresh was the easy-to-miss requirement** (§5 + the demo) — surfaced by the advisor before build. Additive `revalidatePath("/dashboard")` on the KPI-affecting actions; no polling, no realtime.
- **Fully server-rendering the dashboard** structurally sidestepped the `@pulse/db`-into-client-bundle trap that bit Epics 4 and 5 — no client component was needed for a read-only screen with link actions.
- **Charts deferred deliberately** (optional in scope) rather than introduce a bespoke SVG or a charting dependency; KPI cards + lists carry the operational value. Flagged, not skipped silently.
