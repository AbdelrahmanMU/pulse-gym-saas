# Release-Candidate Architecture Review — PULSE Gym SaaS

**Reviewer role:** Principal Software Architect · final architecture review before Release Candidate
**Scope reviewed:** the entire implemented project — Sprint 0 (platform) + Sprint 1 Epics 1–9 + Sprint 1.5 + Reliability Slice 1
**Branch / HEAD:** `feat/platform-foundation` @ `59f2c61` (not merged/tagged)
**Date:** 2026-07-02
**Companion to:** [`../v1.0-foundation.md`](../v1.0-foundation.md) (the frozen foundation baseline)
**Mode:** review-only. No feature implemented, no code generated, no file modified. No critical RC-blocking violation was found (see §0.2).

> **This document is deliverable 1 of 5.** It houses review dimensions 1–7 (Architecture, Design
> System, Code Quality, Security, Performance, Future Scalability) plus Domain Integrity. The
> companion deliverables are [risk-report](./risk-report.md) (2),
> [technical-debt-report](./technical-debt-report.md) (3),
> [rc-readiness-report](./rc-readiness-report.md) (4, the GO/NO-GO), and
> [post-rc-implementation-order](./post-rc-implementation-order.md) (5).
>
> **Reference, never duplicate.** The per-epic verification reports and the
> [Sprint 1.5 stabilization report](../../sprints/sprint-1.5-stabilization-report.md) remain the
> canonical record of *what each slice did*. This review *synthesises, re-classifies, and judges*
> — it does not re-narrate them.

---

## 0. How this review was actually performed

### 0.1 Gate results — re-grounded this session (not cited)

Every gate below was executed against the committed tree this session; results are first-hand,
not carried over from a prior report.

| Gate | Command | Result |
|---|---|---|
| Type-check | `pnpm type-check` | ✅ 9 tasks green |
| Lint + **all** T-27 fitness (ESLint layer) | `pnpm lint` | ✅ green |
| Fitness (Vitest layer): no cycles · no package→app · no ui→db · no cross-context | `architecture.test.ts` | ✅ 5/5 |
| Fitness: token-compliance · ui-layering · no-role-checks (lint-rules) | Vitest fitness suite | ✅ green |
| Format | `pnpm format:check` | ✅ "All matched files use Prettier code style" |
| Production build | `pnpm --filter @pulse/web build` | ✅ compiled 14.3s, **36 routes emit**, shared JS 102 kB, largest page 135 kB |
| Unit + fitness | `pnpm --filter @pulse/web test` | ✅ **178 passed** (26 files) |
| Integration (live test DB `pulse_test` @ :55433) | `test:integration` | ✅ **94 passed** (8 files) |
| E2E (Playwright + axe, workers:1) | `test:e2e` | ✅ **20 passed** (58.7s) |

> **Build note (environmental, not a defect):** an initial run failed with `EPERM … .next\trace`
> — a Windows file-lock caused by running several builds concurrently in this review session, not
> a compile error. A single clean isolated build is green (BUILD_ID emitted, all 36 routes). Zero
> application code changed in this review, so the build corresponds exactly to `59f2c61`.

### 0.2 Was there a critical, RC-blocking violation? **No.**

The frozen-foundation bar for a STOP-and-surface is a finding that **bypasses the mutation
pipeline**: a business query without `gymId`, a mutation missing `authorize`, an editable/deletable
ledger row, a role-name branch, a dependency cycle/cross-context import, or mutated history. The
fitness suite proves the structural half (no cycles, no cross-context, no role-branches, no ui→db);
targeted spot-checks (§1, §5) confirm the behavioural half (tenancy re-proven, money appended not
edited, permission-gated). **Every finding in this review operates *within* the pipeline** —
coverage gaps, UX, and session-lifetime — so none triggers the frozen-foundation STOP. Nothing was
modified.

### 0.3 Honesty ledger — what "verified" means per dimension

| Dimension | Verification basis |
|---|---|
| Architecture (1) | **Gate-verified** — fitness suite (real dependency graph) + spot inspection |
| Domain Integrity (2) | **Test-verified transitively** — 94 integration tests assert invariants directly + spot inspection. *Not* a fresh 40-invariant re-audit |
| Design System (3) | **Split** — axe/e2e-verified on shell/dashboard/onboarding/settings/ui-states at 3 viewports; **code-inspection-only** on members/plans/memberships/payments/notifications/reports/staff (TD-7) |
| Code Quality (4) | **Gate + inspection** — token/ui-layering fitness + read of representative services |
| Security (5) | **Gate + inspection** — no-role-checks + auth-confinement fitness + read of every mutation entry-point pattern |
| Performance (6) | **Code-inspection + build output** — query-shape reading + bundle sizes. Not load-tested |
| Future Scalability (7) | **Code-inspection** — schema, seams, module graph |

---

## 1. Architecture (dimension 1) — **gate-verified · excellent**

The `architecture.test.ts` fitness suite proves, against the *real* dependency graph
(dependency-cruiser), that the codebase has **no cycles, no package→app edges, no ui→db imports,
and no cross-context imports**. This is the architectural backbone and it is green.

- **Modular monolith, feature-sliced** holds exactly as the ADR mandates. Nine vertical slices
  under `apps/web/src/modules/**` (`gym, members, plans, memberships, payments, dashboard,
  notifications, reports, staff`), each a self-contained `validation → service → actions →
  queries → ui` stack. `app/` is routing-only; `lib/` is cross-cutting non-business only.
- **Cross-module communication is public-API-only.** Established in Epic 6 and now uniform:
  a module composes another **only through its bare-directory public `index.ts`**
  (`@/modules/memberships`, never `/service`), so dependency-cruiser resolves the edge to the
  published surface. Spot-checked live in `modules/members/policy.ts` — it composes
  `getMemberMembershipStanding` (memberships) + `getMemberOutstandingBalance` (payments) through
  their indexes; `no-cross-context` is green and the graph stays acyclic because memberships and
  payments never import members.
- **Coupling / cohesion:** domain ownership is clean and un-duplicated — status derives only from
  `memberships/lifecycle.ts`, standing/balance only from `payments/ledger.ts`, revenue only from
  `payments/revenue.ts`, money mechanics only from `lib/money.ts`, time only from an injected
  `IClock`. Dashboard and reports *reuse* these projections rather than recomputing; there is one
  balance definition (INV-24), reused by dashboard, reports, and the archive guard.
- **Verdict:** no architectural change needed or made. This is the strongest dimension and is
  structurally protected against drift.

## 2. Domain Integrity (dimension 2) — **test-verified transitively · sound**

Method: the 94 integration tests assert business invariants **directly** against a live DB, plus
targeted spot-checks. This is a transitive verification of implementation-vs-doc conformance, not a
line-by-line re-audit of all 40 invariants.

- **Invariants exercised by the green integration suite** include: INV-12 (≤1 active / ≤1 scheduled,
  serializable write-path check), snapshot immutability, deferred-upgrade + auto-activation, renewal
  date math, freeze-extension + early-resume frozen-day accounting, cancel terminality, contact
  uniqueness (INV-3/9), one-open-trainer-assignment (INV-35), tenancy-404, permission allow **and**
  deny per action, and the ARC-3/INV-11 archive guard (below).
- **ARC-3 / INV-11 archive precondition** is now enforced (was TD-1). `modules/members/policy.ts`
  blocks archiving a member with an **Active, Scheduled, or Frozen** membership or an **Outstanding
  Balance**. The *Frozen-blocks-archive* clarification was a genuine letter-vs-intent ambiguity
  (ARC-3 enumerated only "Active or Scheduled"; a frozen membership is resumable per FRZ-4, so
  archiving one leaves a live re-access path) — **human-ruled 2026-07-01** and reconciled across
  the domain docs. 8 live-DB P0 tests isolate each block reason. Correctly ordered: tenancy
  `assertSameGym → 404` first, then idempotent already-archived short-circuit, then policy.
- **Money & history:** the Payment table is an append-only ledger — `recordPayment` appends a
  PAYMENT; `voidPayment` appends a VOID entry referencing the original (`voidsPaymentId`), never
  edits or deletes (spot-checked at `service.ts:441–527`). Standing/balance/revenue are derived
  from immutable rows; payment activity never mutates membership status (independent by design).
- **Drift found:** none that contradicts a frozen doc. The one documented behavioural nuance —
  count-vs-cached-list drift on the memberships report/dashboard (TD-2) — is an inherited,
  intentional accelerator trade-off, not a rule violation.

## 3. Design System (dimension 3) — **split verification · high fidelity where scanned**

- **Independently verified (axe, 0 violations, e2e at 1280/768/375):** app shell, dashboard
  (light **and** dark), ui-states surface, onboarding wizard, gym/branch/profile settings; plus
  skip-link-first, banner/nav/main landmarks, keyboard user-menu open + focus-return, mobile
  drawer focus-return.
- **Code-inspection only (NOT independently scanned):** members, plans, memberships, payments,
  notifications, reports, **and staff** pages. They compose the *same* axe-clean catalog primitives
  (`FormField`, `DataTable`, `StatusBadge`, `EmptyState`/`ErrorState`) with the same landmark
  scaffold — strong indirect evidence, but not a scan. This is **TD-7**, and Epic 9's staff pages
  widen it slightly.
- **Tokens-only + catalog-only** are fitness-enforced: `token-compliance` finds zero
  hex/rgb/px/arbitrary-`[...]` across `apps/web/src`; `ui-layering` proves routes import
  `components/pulse/**` only (Radix confined to `components/ui/**`). Status is always icon + label +
  `*-text` token; money via `MetricValue`; dates via `<time>` + tabular-mono; active nav via the
  3px brand accent-bar + `aria-current`.
- **Verdict:** design fidelity is high and structurally enforced. The only gap is *verification
  coverage* (TD-7), not fidelity.

## 4. Code Quality (dimension 4) — **gate + inspection · high**

- **No duplication of business logic** (fitness + inspection): the derive/ledger/money/time cores
  are single-source and reused. Reports/dashboard/archive-guard all consume them.
- **No dead code found:** the previously-empty `assertArchivable` stub and its `it.todo`
  placeholders were removed when Slice 1 landed the real policy.
- **No over-engineering:** no Repository/CQRS/ES/DDD-aggregates; Prisma is the data layer; server
  actions are the command surface. No premature abstractions — public `index.ts` files were
  introduced exactly when the first cross-module read needed them (Epic 6), not speculatively.
- **No under-engineering of note:** functions are small and single-responsibility; the mutation
  pipeline is uniform enough that new slices pattern-match with near-zero variance.
- **Minor:** the client-bundle trap (importing a `@pulse/db` enum *value* into a client component
  drags the pg driver in) recurs as a known gotcha and is consistently avoided via client-safe
  string-literal unions / `import type`. It is a footgun the team already navigates correctly, not
  a defect.

## 5. Security (dimension 5) — **gate + inspection · strongest dimension, with standing pre-prod items**

- **Uniform mutation pipeline, verified at every entry point:** authenticate (`currentUser`) →
  authorize **by permission key** → validate (Zod) → scope `gymId` / `assertSameGym → 404` →
  execute → revalidate. `assertSameGym` throws `NotFoundError` on a tenant mismatch (never 403 —
  never confirms another gym's record exists). Client-supplied ids ride hidden fields but tenancy
  is always re-proven server-side.
- **Permission-based authz, never role-based** — `no-role-checks` fitness proves no `requireRole`
  / `role === …` / `switch(role)`. A manual grep confirmed the only `.role` references are
  Role-as-*data* (staff assigning roles, permission derivation), not authorization branches.
- **Auth.js confined to `lib/auth/**`** (fitness-enforced); resolved permissions ride the
  server-signed JWT; hashing is `scrypt` in `@pulse/auth` (single source, shared by seed + adapter).
- **NEW finding — Epic 9 promoted the session-lifetime gap into a security control.** Staff
  suspension/revocation is now a security action (disable a compromised/terminated account), but the
  session is JWT-strategy with **no `session.maxAge` set** and **no middleware re-check** — a
  suspended/terminated staff member's *already-issued* token remains valid until it naturally
  expires (NextAuth JWT default ≈ 30 days). Suspension blocks **new** sign-ins only. This is
  documented (TD-10), is *not* a pipeline bypass (the token was validly issued), and is acceptable
  for a single supervised pilot — but it is materially more important post-Epic-9 than the 1.5 report
  scored, and **setting a short `session.maxAge` should be a fix-before-RC item.** See
  [risk-report R-1](./risk-report.md).
- **Standing pre-prod items (not new):** auth rate-limiting, password-strength enforcement,
  `AUTH_URL`/`trustHost`, Argon2id-vs-scrypt (TD-10/11), and the automated `/security-review`
  which still cannot run without a git remote (TD-17; a manual review found no critical/high).

## 6. Performance (dimension 6) — **code-inspection + build output · no defect found**

- **Queries** are gym-scoped and paginated (`take`/`skip` + `count` + `findMany`). The members
  list uses a single `include` for the current trainer — **no N+1**. Schema indexing is thorough
  (`@@index([gymId, …])` on every business table, incl. the R-1 `members(gym_id,status,full_name)`).
- **Derived-on-read by design:** the engines recompute status/balance/revenue per read rather than
  trusting a stored value (`cached_*` are recomputable accelerators). Correct for MVP volumes. The
  first place to watch at real scale is the dashboard/reports pages, which load candidate rows and
  derive per-row — a materialised read model or windowed query is the future lever, not needed now.
- **Bundle sizes are healthy:** shared First-Load JS 102 kB; every route server-rendered (`ƒ`)
  except the static home/sign-in/not-found; largest page is the membership detail at 135 kB (it
  carries billing + payment forms). No client-bundle bloat; the pg-in-client trap is avoided.
- **Rendering:** a route-group `loading.tsx` skeleton (Sprint 1.5) provides navigation feedback;
  no writes on RSC GET (notification generation is an explicit on-open server action, not a render
  side-effect). **No premature optimization applied.**

## 7. Future Scalability (dimension 7) — **code-inspection · well-positioned**

- **Multi-Branch:** every business table already carries an indexed `branch_id` (Member, Membership,
  Payment inherit it; `@@index([gymId, branchId])`). Branch context resolves to the gym's oldest
  active branch in MVP — a single seam to extend, not a schema migration.
- **Multi-Gym / multi-tenant:** enforced from day one — `gymId` on every row and every query,
  `assertSameGym → 404`, per-tenant uniqueness. `Role.gymId` is nullable specifically to admit
  future *gym-custom* roles without a migration. This is genuinely multi-tenant, not retrofitted.
- **Future Mobile App / API:** the command surface today is **server actions**, not an HTTP API —
  a mobile client would need a dedicated API layer. The domain is well-placed for it: services take
  an explicit `principal` + injected `IClock`/adapters and are UI-agnostic, so an API route handler
  can call the same service cores. This is the single largest *additive* build for a mobile future
  (not a rework).
- **Background Jobs:** the notification generation trigger is deliberately an idempotent on-open
  server action behind a **replaceable** generation service (TD-8) — swapping in a cron/worker is a
  trigger change, not a logic change, because generation is pure + dedupe-keyed.
- **Reporting scalability:** reports compose the same derived projections; at scale they inherit the
  same "derive-per-row" watch-point as the dashboard (§6). PDF/Excel/scheduled/BI are explicitly
  out of scope and correctly deferred.
- **Adapter seams** (`AuthenticationAdapter`, `IClock`, `IIdGenerator`, `ICurrentUser` in
  `@pulse/types`) mean the platform boundaries — auth provider, clock, id generation — are swappable
  without touching domain code. This is the right amount of seam for the roadmap.

---

## 8. Summary judgement

The implemented system is a faithful, disciplined realisation of the frozen foundation. Architecture,
security/tenancy, money correctness, and design-system fidelity are all strong and — crucially —
**structurally protected by the fitness suite**, so they resist drift as the team keeps shipping. The
gaps that remain are about **verification coverage** (integration allow-paths, a11y scans) and
**session lifetime**, not about architectural soundness. The consolidated debt, risks, RC verdict,
and sequencing are in the four companion deliverables.
