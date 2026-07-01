# Sprint 1 · Epic 6 — Operations Dashboard · Implementation Brief

> One-page brief. The dashboard is the **daily operational home screen**, not a report: it answers *"what needs attention today?"*. Everything shown is action-oriented (navigable). Reuses the Membership engine, Payment ledger, existing read models, authorization, and the Design System. No schema change.

## What ships

A dedicated **Dashboard Read Model** (`modules/dashboard/`) — the only source the dashboard UI reads — composing existing modules through their **public `index.ts` entries**, plus the catalogued `StatCard`/`KPIGrid`, and a rebuilt `/dashboard` page.

1. **KPI cards** — Active Members, Expiring Soon (gym window), Expired, Frozen, Scheduled (all derived membership-status counts), Revenue Today, Revenue This Month (derived from the immutable ledger).
2. **Operational lists** — Expiring Soon, Expired, Outstanding Balances, Recent Members — each item navigates to its detail.
3. **Quick actions** — Add Member / Sell Membership / Record Payment (navigation only), each shown **by permission**.
4. **Refresh** — KPI-affecting mutations add `revalidatePath("/dashboard")` (existing cache pattern; no polling, no realtime).
5. **Responsive + a11y** — KPI grid reflows 4→2→1; lists are semantic `<ul>` with headings + EmptyState; single `<h1>`, landmark regions, `<time>` for dates, MetricValue for numbers.

## Architecture (the new, intended pattern)

- **Read models live in their home modules; the dashboard composes them.** New public read functions: `memberships.getMembershipOverview` (counts + expiring/expired lists via the existing `deriveRow`), `payments.getRevenueSummary` + `payments.getOutstandingBalances` (via the existing `summarizeLedger` — no new money math), `members.listRecentMembers`. **UI performs zero business calculation.**
- **Cross-module composition via `index.ts`.** The `no-cross-context` fitness rule allows a module to import another module only through its public `index` entry. This Epic introduces the first module→module composition, so it adds `index.ts` public entries for members/memberships/payments and the dashboard imports the **bare directory** (`@/modules/memberships`) — exactly the pattern that rule rewards (constitution §2 "communicate through public functions").
- **Fully server-rendered** (RSC): read-only data + link-based quick actions need no client component — which also structurally avoids the server-only-`@pulse/db`-in-client-bundle build trap.

## Authorization

Page + read model gated by `dashboard.view`. Each composed read authorizes its **domain** permission (`memberships.read` / `payments.read` / `members.read`). Verified: **every seeded role that holds `dashboard.view` also holds all three reads** (Owner all; Front Desk / Manager / Accountant each hold the reads). Flag: an AuthorizationError thrown *inside* the read model would bubble to the error boundary rather than the page's inline Forbidden — acceptable given that seed guarantee.

## Decisions & interpretation flags (§13 — surfaced, not guessed)

- **D1 — "Active Members" = count of ACTIVE memberships.** INV-12 (≤1 active per member) makes this equal to "members with live access". Frozen/Scheduled are their own cards; Expiring Soon is a subset of Active (still counted Active).
- **D2 — Outstanding Balances excludes CANCELLED and SCHEDULED memberships;** includes ACTIVE / FROZEN / EXPIRED with `remaining > 0`. CANCELLED = balance written off (immutable `cancelledAt`). SCHEDULED = a not-yet-started future period (every upgrade / early renewal creates one with zero payments → full balance) whose payment isn't *today's* concern; excluded via the `cached_status` accelerator so an **activated** renewal that is now ACTIVE (with a balance) still shows. Derived from `snapshotPrice − summarizeLedger(...)`, never stored.
- **D3 — Revenue basis = `receivedAt`, signed ledger sum via `summarizeLedger(0n, filtered)`** (single sign authority; no duplication). Today / This-Month buckets judged in **gym tz**; a void (dated at void time) reduces the current period and can make a period net-negative — documented, correct for a cash-flow view.
- **D4 — Charts deferred.** Explicitly optional in scope ("allowed only if… Maximum:"); a bespoke SVG or a charting dependency would violate §3 (no bespoke UI) / §9 (no new dep without approval). KPI cards + lists deliver the operational value.
- **D5 — KPIGrid uses responsive breakpoint columns** (4→2→1), not CSS `auto-fit`, because the token-compliance fitness rule forbids arbitrary `[...]` classes in `apps/web/src`. Same reflow outcome; no globals.css change.
- **Refresh:** `revalidatePath("/dashboard")` added to payment record/void, membership create/renew/upgrade/freeze/resume/cancel, and member create.

## Explicitly OUT OF SCOPE (unchanged)

Advanced analytics · forecasting · AI insights · custom/configurable dashboards · export · drill-down charts · realtime · notifications · reports · attendance · goals · widget config.
