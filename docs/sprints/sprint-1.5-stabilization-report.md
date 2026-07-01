# Sprint 1.5 — MVP Stabilization & Beta Readiness

**Status:** COMPLETE · Fast Delivery · branch `feat/platform-foundation` · 2026-07-01
**Scope:** Review-only stabilization of the existing MVP (Sprint 1 Epics 1–8). No new
business features, permissions, roles, schema, or ADRs. Triage: fix high-value
consistency/UX/reliability in-place; defer the rest into the Technical Debt Summary.

> **Honesty note (how each area was verified).** This sprint mixes reviews that only mean
> something against a running app with reviews that are legitimately code-inspectable. Each
> section states its method explicitly. Where a claim rests on the running app, the app (or
> the Playwright + axe e2e suite) was actually run; where it rests on reading code, that is
> said plainly. No dimension is claimed "verified" on inspection alone.

---

## 0. Baseline & verification method

| Gate | Result |
|---|---|
| `pnpm type-check` | ✅ green |
| `pnpm lint` (incl. all T-27 fitness: no-cross-context, token-compliance, no-role-checks, ui-layering, no-ui→db) | ✅ green |
| `pnpm format:check` | ✅ green |
| `pnpm build` | ✅ 5/5 tasks, all routes emit |
| `pnpm --filter @pulse/web test` (unit + fitness) | ✅ **178 passed** |
| `pnpm --filter @pulse/web test:e2e` (Playwright + axe, workers:1) | ✅ **20 passed** (1.9m) |

**What the e2e suite actually covers** (the honest a11y/mobile/flow backbone): sign-in;
onboarding wizard end-to-end; gym/branch/profile settings incl. server-side blank-name
rejection; the app shell (banner/nav/main landmarks, skip-link, user-menu keyboard open +
focus-return); **axe scans** of the dashboard shell (light **and** dark) and the ui-states
surface; the error boundary; and **responsive checks at 1280 / 768 / 375** (rail vs. mobile
drawer, focus-return on Escape). It does **not** drive members / plans / memberships /
payments / notifications / reports flows or axe-scan those pages — those reuse the same
catalog primitives the shell verifies, but were reviewed by **code inspection**, not an
independent scan. That distinction is carried through every section below.

---

## 1. Product Flow

**Method:** e2e (onboarding + settings) · code inspection (all newer module flows) ·
architecture/route survey.

The core owner journey is coherent and consistent. Every mutating flow follows one pipeline
(authenticate → authorize **by permission** → validate (Zod) → scope `gymId` → execute →
`revalidatePath`), and every route uses the same page scaffold (`PageContainer` →
`PageHeader` → catalog body) with permission-gated actions and an inline Forbidden
`ErrorState`. Navigation is permission-driven, never role-driven.

**Friction points found:**

- **F1 (fixed) — a missing / cross-tenant *record* dropped the user to a bare framework 404.**
  Detail pages correctly translate a not-found / cross-tenant id into Next's `notFound()`, but
  there was **no `not-found.tsx`** anywhere, so the result was the unstyled default page
  *outside* the app shell. Added `(app)/not-found.tsx` rendering the Catalog `EmptyState`
  inside the shell with a "Back to dashboard" action. **Scope:** this catches `notFound()`
  raised *within* the `(app)` segment (the resource-not-found case that matters); an arbitrary
  unmatched URL (e.g. `/totally-fake`) never enters the segment and still falls to the
  framework default — out of scope for this fix.
- **F2 (fixed) — No loading feedback on navigation.** There were **zero** `loading.tsx`
  files and no `Suspense` boundaries, so navigating to a data page left the content area
  blank until the RSC resolved. Added a route-group `(app)/loading.tsx` skeleton (header +
  content blocks) that renders in `<main>` while the shell stays mounted.
- **P1 (flagged, not changed) — the "Payments" nav item is a disabled placeholder, but
  payments actually ship.** Payments are recorded/voided from the membership detail page
  (Epic 5), yet the sidebar shows a muted, non-navigating "Payments" entry. This *misrepresents
  shipped functionality* (an owner reads it as "not available"). Recommend either removing the
  placeholder or repointing it — this is a nav/IA decision (constitution §11), so it is
  surfaced, not unilaterally changed. See Beta Blockers.

## 2. UI Consistency

**Method:** code inspection of every route + the pulse catalog (30 components).

Strong and uniform. Two-layer UI holds (`components/ui/**` Radix primitives are the only
Radix consumers; routes import `components/pulse/**` only — enforced by `ui-layering`
fitness). **Tokens-only** holds (the `token-compliance` fitness scan finds zero
hex/rgb/px/arbitrary-`[...]` across `apps/web/src`, and passed on the two new files). Status
is always conveyed by badge (icon + label + `*-text` token), never color alone. Money renders
through `MetricValue`/currency components; dates through `<time>` + tabular-mono; the active
nav item carries the 3px brand accent-bar + `aria-current`. Page scaffolding
(`PageContainer`/`PageHeader`) is identical across all 25 pages. No bespoke UI was found where
a catalog component exists. **No inconsistencies warranting a code change.**

## 3. Forms

**Method:** code inspection of `FormLayout`/`SubmitButton`/`FormField` + all module forms.

Consistent and accessible by construction. `FormField` guarantees label + `aria` + error
wiring and renders the required marker; `SubmitButton` reflects `useFormStatus` (disabled +
`aria-busy` + pending label) preventing double-submit; a shared `FormFeedback` surfaces
form-level error/success; Zod runs server-side and returns per-field errors mapped back into
the fields; `autoComplete` is set appropriately (name/tel/email). Cancel is always a
secondary link to the prior context.

- **D-form1 (deferred, minor) — no autofocus on the first field** of create forms. A small
  UX nicety; left out deliberately (programmatic focus-on-load is a mild a11y trade-off).
  Recorded in Tech Debt, not fixed.

## 4. Tables

**Method:** code inspection of the `DataTable` primitive + list pages (members/plans/etc.).

One canonical `DataTable` (no bespoke tables). Semantic `<table>`, `scope`d headers,
right-aligned tabular-mono numeric columns, an `empty` slot, a responsive **priority** system
(priority-2/3 columns drop under `sm`/`md`; horizontal scroll as backstop), and a caption for
AT. Search / status / trainer filters and pagination are URL-param driven (shareable,
back-button-safe) with distinct **filtered-empty vs. never-created** empty states. Loading is
now covered by the new route-group skeleton (§1 F2). Sorting and selection are deliberately
absent (no story needs them). **No change needed.**

## 5. Performance

**Method:** code inspection of query patterns; build output.

- Queries are gym-scoped and paginated (`take`/`skip`), with a `count` + `findMany` per list.
  The members list uses one `include` for the current trainer (no N+1). Derived read-models
  (dashboard/reports) compose module reads through public indexes and do math in pure helpers
  reused across features — no duplicated aggregation.
- **Cross-cutting note (not a per-query bug):** the derived engines
  (`deriveMemberLifecycle`/`deriveRow`, `summarizeLedger`, `sumRevenueInRange`) recompute
  status/balance/revenue on each read rather than reading a stored value. This is **by design**
  (immutable source of truth; `cached_*` are accelerators) and correct for MVP data volumes.
  At real scale the dashboard/reports pages (which load candidate rows and derive per-row)
  are the first place to watch; none is a problem at beta volumes.
- **F2** (loading skeleton) is the one perceived-performance improvement made.
- No premature optimization applied. **No N+1 or duplicated-query defect found.**

## 6. Security

**Method:** code inspection of every server action/service + fitness suite.

Solid and consistent — this is the strongest dimension.

- **Every** mutation resolves the principal server-side (`currentUser.require()`), authorizes
  **by permission key** (never role — `no-role-checks` fitness proves no `requireRole` /
  `role === …` / `switch(role)` exists), validates with Zod, scopes by `principal.gymId`, and
  loads-then-`assertSameGym` (cross-tenant → **404**, never 403 — never confirms another gym's
  record). Client-supplied identity/scope is never trusted; ids ride hidden fields but tenancy
  is re-proven in the service.
- Auth.js is confined to `lib/auth/**` (fitness-enforced); the resolved permission set rides
  the server-signed JWT. Password hashing is `scrypt` in `@pulse/auth` (single source, shared
  by seed + adapter).
- **Known standing items (not new, not redesigned):** auth rate-limiting, password-strength
  enforcement, session `maxAge` tuning for shared terminals, and `AUTH_URL`/`trustHost` for
  prod are Phase-2 hardening; the Argon2id-vs-scrypt decision is pre-prod; the automated
  `/security-review` skill still cannot run (no git remote) — a manual review found no
  critical/high. All carried in Tech Debt. **No security inconsistency fixed or needed in
  code.**

## 7. Accessibility

**Method:** e2e **axe** (shell/dashboard light+dark, ui-states, onboarding, settings) +
keyboard/focus e2e · code inspection of newer module pages.

- **Independently verified (axe, 0 violations):** app shell, dashboard, ui-states, onboarding,
  gym/branch/profile settings — plus skip-link-first, landmark structure (banner/nav/main),
  user-menu keyboard open + focus-return-on-Escape, and the mobile drawer focus-return.
- **Reviewed by inspection (not independently scanned):** members / plans / memberships /
  payments / notifications / reports pages. They compose the *same* axe-clean catalog
  primitives (`FormField` aria wiring, `DataTable` scoped headers + caption, `StatusBadge`
  icon+label, `ErrorState`/`EmptyState` roles) with the same landmark scaffold, which is strong
  indirect evidence — but it is **not** an independent scan. Closing that gap (extend e2e axe
  to the newer routes) is the top testing recommendation.
- The two new files (`not-found`, `loading`) carry correct semantics (`EmptyState` heading +
  action; `role="status"`/`aria-busy` on the skeleton region). **No a11y defect found.**

## 8. Mobile

**Method:** e2e viewport checks at 375 / 768 / 1280 (shell) · code inspection (page bodies).

- **Verified in e2e:** the shell reflows correctly — persistent rail ≥lg, off-canvas Radix
  drawer <lg (nav never disappears), mobile toggle shows/hides at the right breakpoints, focus
  returns to the toggle on close.
- **Reviewed by inspection:** page bodies use responsive grids (`md:grid-cols-2`), the
  `PageContainer` gutter scale (`px-4` → `md:px-8`), and `DataTable`'s column-priority drop +
  horizontal-scroll backstop — all mobile-safe patterns. Not independently screenshotted at
  each viewport for every module page. **No layout defect found in inspection; no change made.**

## 9. Architecture

**Method:** fitness suite (green) + spot inspection.

No drift. `architecture.test.ts` proves the real dependency graph has **no cycles, no
package→app edges, no ui→db, and no cross-context imports** — cross-module reads go only
through public `index.ts` (bare-directory imports). Business/money/time/permission logic is
**not** duplicated: status derives from `lifecycle.ts`, standing/balance from `ledger.ts`,
revenue from `sumRevenueInRange`, money mechanics from `lib/money`, time from an injected
`IClock`; reports/dashboard *reuse* these rather than recomputing. Modules are clean vertical
slices; `app/` is routing-only. **No architectural change needed or made.**

## 10. Technical Debt

See the **Technical Debt Summary** below (§ TD). Consolidated from the per-epic verification
reports + memory; each item confirmed still-intentional or re-classified. One item changed
status this sprint (TD-1, ARC-3/INV-11 — see below).

## 11. Beta Readiness Score

**Overall: 8 / 10 — Beta-ready for a single supervised pilot gym, with one correctness gap
to close first.**

| Dimension | Score | Basis |
|---|---:|---|
| Architecture & consistency | 9.5 | Fitness-enforced; zero drift |
| Security & tenancy | 9 | Uniform pipeline; standing hardening is Phase-2 |
| UI / design-system fidelity | 9.5 | Tokens-only, catalog-only, verified |
| Forms & tables | 9 | Consistent, accessible by construction |
| Accessibility (verified surfaces) | 9 | axe-clean where scanned |
| Accessibility (newer modules) | 7 | Inspected, not independently scanned |
| Product-flow completeness | 8 | Coherent; nav placeholder + 404/loading (now fixed) |
| **Business-invariant enforcement** | **6** | **ARC-3/INV-11 now live-unenforced (TD-1)** |
| Test depth | 6.5 | Excellent pure-core + e2e shell; **no live-DB integration on E5/E7/E8 service paths** |

The two low scores are the honest blockers to a clean 9+: the archive precondition (TD-1) and
integration-test depth on the money/notification/report service layers (TD-6).

---

## TD — Technical Debt Summary

Consolidated from the Epic 1–8 verification reports + project memory. **Fix-in-place items
this sprint: TD-13, TD-14** (done). Everything else is confirmed intentionally deferred or
re-classified with rationale.

| # | Item | Status / rationale | Priority |
|---|---|---|---|
| **TD-1** | **ARC-3 / INV-11 archive preconditions unenforced.** `assertArchivable` is still an empty stub. It was *vacuously* safe when deferred in Epic 2 (no memberships/payments existed). **Epics 4–5 shipped both, so a member with an Active/Scheduled membership or an Outstanding Balance can now be archived — a live violation of a documented invariant** (money/tenant-correctness adjacent). | **Re-classified: was safe, now a real gap.** Fixing it enforces an *existing* rule (no new feature/schema) but needs cross-module reads (memberships/payments public index) **and P0 integration tests** — more than a polish fix, so surfaced for decision rather than silently patched. | **Beta blocker (highest)** |
| TD-2 | Count-vs-cached-list drift (memberships report / dashboard). Counts derive live (`deriveRow`); list filters use the `cachedStatus` accelerator → a time-drifted row can count "Expired" yet list "Active" with an Expired badge. | Intentional/inherited (Epic 4/6/8). Fix touches cache-reconciliation; **flagged, not changed**. | Post-beta |
| TD-3 | Notifications & Reports are **Owner-only** in MVP (Manager/Accountant hold the perms but are dormant/unassignable). | Intentional. | Post-beta |
| TD-4 | `assignTrainer` race not serialized (concurrent set → possible P2002/500). | E2 carryover; low-frequency. | Post-beta |
| TD-5 | INV-36 revoke side (clear a removed trainer's open assignments) not wired. | Deferred until Staff Management exists. | Post-beta |
| TD-6 | **No live-DB integration tests** for the E5 (payments), E7 (notifications), E8 (reports) **service** paths — pure-core + authz-deny unit tests only (E1–E4 have real-DB P0 tests). | Standing gap; the biggest test-depth risk for beta. | **Beta consideration (high)** |
| TD-7 | A11y/mobile for members/plans/memberships/payments/notifications/reports pages not independently e2e-axe-scanned (reuse verified primitives). | Extend e2e axe to newer routes. | High (cheap) |
| TD-8 | Notification generation trigger = idempotent server action on page-open (no cron). | MVP-only, swappable for cron/worker; documented. | Post-beta |
| TD-9 | Membership-level trainer / freeze-reason / cancel-reason / membership-notes not persisted (no column). | Schema change → out of scope. | Post-beta |
| TD-10 | Auth hardening: rate-limiting, password-strength, session `maxAge` for shared terminals, `AUTH_URL`/`trustHost`. | Phase-2. | Pre-prod |
| TD-11 | Argon2id-vs-scrypt KDF evaluation (KDF change = rehash-on-next-login). | Pre-prod decision. | Pre-prod |
| TD-12 | `authorization-architecture.md §4/§6` `gym.view` + `DDS §16` seed reconciliations. | Governance-doc edits, human's call. | Post-beta |
| TD-13 | Bare framework 404 on missing/cross-tenant links. | **FIXED** — `(app)/not-found.tsx`. | ✅ Done |
| TD-14 | No route-level loading feedback. | **FIXED** — `(app)/loading.tsx`. | ✅ Done |
| TD-15 | "Payments" nav placeholder misrepresents shipped payments functionality. | Nav/IA decision (§11) — **flagged** for owner. | High (cheap) |
| TD-16 | No autofocus on first create-form field. | Minor UX; deliberate. | Nice-to-have |
| TD-17 | `/security-review` automated skill can't run (no git remote). | Manual review done (no critical/high); re-run once a remote exists. | Pre-prod |

---

## Beta Readiness Report

### Strengths
- **Architecture & consistency are exceptional for an MVP.** Fitness tests make drift
  structurally hard: no cycles, no cross-context imports, no role-branching, tokens-only,
  two-layer UI. New code pattern-matches existing code with near-zero variance.
- **Security/tenancy is uniform and correct** — one mutation pipeline everywhere, gym-scoping
  and `assertSameGym→404` on every tenant-owned read, permission-based authz end to end.
- **Money & derived state are principled** — immutable ledger, derived standing/balance/revenue,
  integer minor units, injected clock. No float money, no mutated history.
- **Design-system fidelity is high** — verified axe-clean on every scanned surface, responsive
  shell verified at three viewports.

### Weaknesses
- **TD-1: a documented invariant (ARC-3/INV-11) is now live-unenforced.** The single most
  important correctness gap.
- **TD-6: shallow integration-test depth on the newest service layers** (payments/notifications/
  reports) — correctness currently rests on tested pure cores + deny-path unit tests, not on
  real-DB allow-path/404/idempotency tests.
- **TD-7: newer module pages not independently a11y-scanned.**

### Risks
- Archiving a member mid-membership (or with a balance) would desync operational reality from
  the record (TD-1) — an owner-visible data-integrity surprise.
- A regression in an untested service allow-path (TD-6) would not be caught by the current
  suite until manual/e2e testing.

### Recommended Beta Blockers (close before the first real gym)
1. **TD-1 — enforce ARC-3/INV-11** (compose memberships/payments reads in the archive guard;
   add P0 integration tests). *Highest.*
2. **TD-6 — add live-DB integration tests** for at least the payment record/void and
   membership-report allow-paths + 404 + idempotency.
3. **TD-15 — resolve the Payments nav placeholder** (remove or repoint). *Cheap.*
4. **TD-7 — extend e2e axe** to the newer module pages. *Cheap, closes the a11y honesty gap.*

Everything else (TD-2/3/4/5/8/9/12/16) is genuinely post-beta; TD-10/11/17 are pre-prod.

---

## Recommended Post-Beta Roadmap

1. **Reliability slice** — TD-1 (archive guard + tests), TD-4 (serialize `assignTrainer`),
   TD-2 (reconcile count-vs-cached-list at a single derive source).
2. **Test-depth slice** — TD-6 (integration tests across E5/E7/E8 service paths) + TD-7
   (e2e axe on all module pages), making the P0 layer uniform across every epic.
3. **Staff Management (Epic 9-adjacent)** — activates dormant roles, unlocks TD-5 (INV-36
   revoke side) and TD-3 (multi-role visibility for Notifications/Reports).
4. **Notification delivery** — replace the on-open generation trigger with a scheduled
   worker/cron (TD-8); consider the per-gym `expiredNotificationWindowDays` column deferred in
   NTF-5.
5. **Pre-prod hardening** — TD-10 (auth rate-limit/password-strength/session tuning), TD-11
   (Argon2id), TD-17 (automated security review once a remote exists), and the governance
   reconciliations TD-12.
6. **Membership richness** — the deferred columns (TD-9: membership trainer / freeze &
   cancel reasons / notes) as a single reviewed schema migration.

---

## Changes made this sprint (in-place fixes)

| File | Change |
|---|---|
| `apps/web/src/app/(app)/not-found.tsx` (new) | Branded in-shell 404 (Catalog `EmptyState`), replacing the bare framework page. |
| `apps/web/src/app/(app)/loading.tsx` (new) | Route-group loading skeleton in `<main>` for immediate navigation feedback. |

Both compose existing catalog primitives with tokens only. The full gate was re-run **after**
these files were added — type-check · lint + all fitness · format · build · 178 unit tests ·
**e2e re-run green** (the route-group `loading.tsx` adds a Suspense boundary around every
`(app)` page, including the timing-sensitive onboarding wizard, so e2e was deliberately
re-executed against the committed tree, not just the pre-change tree). No business logic,
schema, permission, role, or ADR was touched.
