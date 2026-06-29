# Sprint 0 — Exit Checklist

### PULSE Gym SaaS · Readiness gate into the closing session

| | |
|---|---|
| **Purpose** | Verify, dimension-by-dimension, that the execution platform Sessions 1–4 delivered is structurally complete and sound — and to surface the *exact* remaining work that Sprint 0 closure depends on. |
| **Status** | 🟡 **GATE INTO SESSION 5 — not a close-out.** Sessions 1–4 verified ✅; platform is structurally ready to close. **Closure is gated on Session 5 (T-24 / T-25 / T-27) + the Sprint 0 Completion Report — Sprint 0 is NOT yet closed.** |
| **Verified on** | 2026-06-29 · HEAD `8ec6cc2` · branch `feat/platform-foundation` (not merged) · Node 20.20.0 · pnpm 9.15.4 · Windows 11 + Docker 27.4.0 |
| **Authority** | Exit criteria: `sprint-0-technical-specification.md` §7.1 (per-session) + §8 (sprint-level Definition of Success). Per-area evidence lives in the per-session verification reports — **this checklist cites them, it does not re-prove them** (a fact lives in one document). |
| **Scope discipline** | This is a verification artifact. It introduces no code, no decision, and no scope change. The gaps it surfaces (§Pending) are *precisely* the Session 5 scope — no more, no less. |

> **How to read the status column.** ✅ **Verified** = empirically confirmed (this session at HEAD `8ec6cc2`, or cited from a same-HEAD session report). 🟡 **Partial** = the substantive work is in place but a Session-5 task (T-24/T-25/T-27) must complete the dimension before closure. Every 🟡 names its blocking task ID. Nothing here is green-washed: the three genuinely-partial dimensions read as partial.

---

## 1. Provenance of the evidence

| Session | Theme | Tasks | State | Evidence |
|---|---|---|---|---|
| 1 | Workspace & Build Platform | T-01…05, T-21, T-22 | ✅ Approved | `session-progress.md` (Session 1) |
| 2 | App, Data & Runtime Foundations | T-06, 09, 10, 11, 15, 16, 18, 23 | ✅ Verified (`v0.2.0-platform`) | `session-2-verification-report.md` |
| 3 | IAM & Platform Adapters | T-07, 19, 20, 26 | ✅ **Approved** (`v0.3.0-iam-foundation`) | `session-3-verification-report.md` |
| 4 | Design System, Shell & Errors | T-12, 13, 14, 08, 17 | ✅ Verified — accepted (this directive) | `session-4-verification-report.md` |
| 5 | Hooks, CI & Architectural Fitness | T-24, 25, 27 | 🔜 **Pending — the closing session** | `session-5-release-hardening-plan.md` |

**Re-grounded at HEAD `8ec6cc2` this session** (not merely cited): `pnpm turbo run build` (5/5 green), the unit/fitness suite (39 green), the integration suite (7 green, live test DB), and the E2E suite (15 green, Playwright). See §Platform Baseline for timings.

---

## 2. Dimension-by-dimension verification

### 2.1 Architecture — ✅ Verified
- Modular monolith, feature-sliced; `apps/web` consumes `@pulse/*` packages via `workspace:*` `dist` entries (no `transpilePackages`). The five D-7 packages (`config`, `db`, `auth`, `design-tokens`, `types`) exist with single public entries; the four deferred packages (`ui`, `domain`, `utils`, `validation`) are absent (YAGNI / A1).
- **Dependency law holds** (`apps → packages → lower`; no cycles; `@pulse/ui`↛`@pulse/db`): enforced at lint-time (ESLint boundaries/deep-import ban) **and** asserted statically by the fitness subset (`apps/web/fitness/architecture.test.ts`, dependency-cruiser, green this session).
- Authorization confined to `@pulse/auth`; `@pulse/domain` empty (no business logic, per scope).
- **Evidence:** `session-2-verification-report.md §3.1`; `architecture.test.ts` green at HEAD `8ec6cc2`.

### 2.2 Database — ✅ Verified
- Prisma 7 + `@prisma/adapter-pg` client singleton in `@pulse/db`; PostgreSQL 18 via Docker Compose (native `uuidv7()`); host ports 55432 (dev) / 55433 (test).
- Initial migration applies on a clean DB; the hand-authored SQL tail (extensions `pg_trgm`/`btree_gist`, partial uniques, GiST exclusion INV-13, CHECKs, trigram GIN) is present and verified in-DB; `prisma migrate status` clean. Seed is idempotent and deterministic: 13 capabilities / 40 permissions / 5 roles / 102 mappings / Gym + default Branch + Owner GymUser + reserved `system-actor`.
- **Tenancy & money laws not violated** by the platform (no feature data yet; ids-not-bodies logging; secrets never persisted to logs).
- **Evidence:** `session-2-verification-report.md` (migrate/seed/constraints sections). Live test DB exercised this session by the integration suite (7 green).

### 2.3 Authentication — ✅ Verified (security-reviewed)
- Auth.js v5 (Credentials) **confined behind the `AuthenticationAdapter`** interface (`@pulse/types`); the adapter returns a domain-shaped principal — no `next-auth` types leak into domain/app code. Gym/branch-scoped JWT session; `crypto.scrypt` hashing (human-vetoable; Argon2id evaluation is an accepted pre-production follow-up).
- Seeded Owner signs in → gated dashboard → sign-out (full path E2E-verified); invalid credentials rejected; unauthenticated access redirects.
- **Security gate PASSED (2026-06-26)**; manual security review performed (no remote → automated `/security-review` deferred as an accepted follow-up).
- **Evidence:** `session-3-verification-report.md §1` (AC), `§2` (security validation), `§3` (authentication verification), `§5` (empirical security tests); Session 3 **APPROVED**, tag `v0.3.0-iam-foundation`. Perimeter **frozen/untouched** since (Session 4 report, auth-perimeter row).

### 2.4 Authorization — ✅ Verified (security-reviewed)
- Permission-based only. `@pulse/auth` is the **sole** authorization home: immutable permission **keys** (INV-7), `hasPermission(session, key)`, and a server-side gate proven end-to-end on a `dashboard.view`-gated placeholder route (allow/deny **by permission**; cross-tenant → 404).
- **Zero role-name branches** (no `requireRole` / `role ===` / `switch(role)`) — grep-verified; tests assert on permissions, not roles. Dormant roles exist but are unassignable.
- **Caveat (carried, not a defect):** the inline-403 *branch* is implemented but not test-exercised — the frozen seed has no actor lacking `dashboard.view`. The 403 *visual* is demonstrated on `/ui-states`. Recorded honestly in `session-4-verification-report.md §8.9`.
- **Evidence:** `session-3-verification-report.md §§1, 4`.

### 2.5 Platform Adapters — ✅ Verified
- Exactly three thin platform-boundary interfaces in `@pulse/types`: **`IClock`**, **`IIdGenerator`** (UUID v7), **`ICurrentUser`** (principal sourced from the Authentication Adapter). Concrete impls in `apps/web`; injectable fakes usable in tests. **`IFileStorage` correctly deferred** (no MVP consumer).
- Boundaries, not repositories/CQRS/business services — consistent with the ADR ("Prisma is the data layer").
- **Note:** the *full* "no raw `Date.now()`/`randomUUID()`/Auth.js in domain" fitness enforcement is part of T-27 (see §2.13, Session 5). The interfaces and impls themselves are complete.
- **Evidence:** `session-3-verification-report.md §0` (file map) + `§1` (AC — adapter interfaces & fakes); `§6` (architectural fitness results).

### 2.6 Design System — ✅ Verified
- Tailwind v4 (CSS-first `@theme`, no JS theme config) driven entirely by PULSE tokens; `globals.css` owned by `@pulse/design-tokens`, imported at `apps/web/src/app/globals.css`; three fonts via `next/font`.
- **Single styling path:** tokens → shadcn primitives (Radix, restyled to tokens, isolated to `components/ui/**`) → PULSE components (`components/pulse/**`). No default-shadcn-theme leakage; no parallel sheet.
- **Token compliance enforced:** `fitness/token-compliance.test.ts` (4 checks) finds zero hex/rgb/px/arbitrary-value literals across `apps/web/src` — green this session.
- **Evidence:** `session-4-verification-report.md §§2–3, 6`.

### 2.7 UI Foundation — ✅ Verified
- Authenticated **AppShell / Sidebar / TopBar** renders Catalog components only, on tokens only; active-nav 3px brand accent-bar; signed-in user shown; sign-out works.
- Error boundary surface: `(app)/error.tsx` + `global-error.tsx` render the Catalog `ErrorState`; a forced server throw is caught and recovered (Try-again); `instrumentation.ts` logs the error once server-side keyed to `error.digest`.
- Structural-only by design: search / notifications / branch-switch and a dark-mode toggle are deferred to their first owning feature (accepted deferrals).
- **Evidence:** `session-4-verification-report.md §§1, 6, 8`.

### 2.8 Accessibility — ✅ Verified (Design System v1.1 §7 gate)
- Automated axe: **0 violations** in **light and dark** (`/`, `/dashboard`, `/ui-states`). Landmarks (`banner` / `navigation "Primary"` / `main`); skip-link is the first focusable element; visible 2px focus ring + offset (base-layer, never removed); keyboard nav + focus return for the user menu and the mobile drawer; `aria-current="page"` on active nav (not colour alone); reduced-motion honored.
- **Evidence:** `session-4-verification-report.md §4`.

### 2.9 Responsive Behavior — ✅ Verified
- Driven at three viewports: **375** (rail → focus-trapped off-canvas drawer; Esc closes + returns focus), **768** (drawer below `lg`), **1280** (persistent rail; toggle hidden). The nav never disappears; content reflows to a single column.
- **Evidence:** `session-4-verification-report.md §5`.

### 2.10 Logging — ✅ Verified
- Single Pino-based logger utility in `lib/`; one JSON line per event with the standard fields; per-request correlation via `AsyncLocalStorage` child logger; `redact` configured and unit-verified (secrets/PII never present — ids, not bodies). `console.log` lint-forbidden in committed code.
- **Evidence:** `session-2-verification-report.md` (logging section).

### 2.11 Health Monitoring — ✅ Verified (endpoint); deploy-wiring deferred
- `/api/health` (public, unauthenticated): healthy → 200; DB unreachable → 503; minimal payload, no secrets/business data. Both paths reproduced.
- **Accepted deferral (not a defect):** the *app-container* healthcheck wiring in Compose is a Phase-1 deployment item (no app container in Sprint 0). The endpoint itself is complete and exercised by the integration suite.
- **Evidence:** `session-2-verification-report.md` (health section).

### 2.12 Testing — ✅ Framework + suites verified · 🟡 merge-blocking CI gate pending (T-25)
- **Toolchain complete:** Vitest (+ Testing Library), Playwright (E2E), axe-core (a11y, CI/test-only), containerized isolated test DB (:55433) with reset-between-tests. Turbo runs unit/fitness.
- **All 61 tests green at HEAD `8ec6cc2`, re-run this session:** 39 unit/fitness · 7 integration (live test DB) · 15 E2E (Playwright, single worker — see report §8.7).
- 🟡 **Pending for closure:** wiring the suites **merge-blocking in CI** is **T-25 (Session 5)**. The framework is done; only the automated gate is outstanding (no git remote exists yet → CI authored-but-dormant per D-6).
- **Evidence:** `session-4-verification-report.md §7`; re-grounded this session (§Platform Baseline).

### 2.13 Architectural Fitness Tests — 🟡 PARTIAL — full suite is T-27 (Session 5)
- **In place now (3 of 6 rules):** `apps/web/fitness/architecture.test.ts` (dependency-cruiser) enforces ① **no circular dependencies**, ④ **no `@pulse/ui` → `@pulse/db`**, and **packages↛apps**; plus the lint-layer rules pulled forward in Session 2 (deep-import ban, role-name authz guard, hardcoded-permission guard at lint-time). Green this session.
- 🔜 **Missing — Session 5 (T-27)** completes the full six-rule suite + planted-violation tests + **CI wiring**:
  - ② **no direct role checks** as a *fitness assertion* (today grep/lint-level only),
  - ③ **no cross-context imports** (a context never imports another context's internals),
  - ⑤ **no hardcoded permission names** as a *fitness assertion* (must reference `@pulse/auth` key constants),
  - ⑥ **no Auth.js import outside the Authentication Adapter** as a *fitness assertion*,
  - the **platform-adapter rule** (no raw `Date.now()` / `crypto.randomUUID()` / Auth.js in domain — T-26 enforcement), and a **planted-violation test per rule**.
- **Evidence:** `architecture.test.ts` (this HEAD); spec T-27; `session-2-verification-report.md §3.1` (lint-layer subset).

### 2.14 Documentation — ✅ Verified
- Per-session verification reports (2/3/4) + `session-progress.md` closure record + `decision-log.md` (through ADR-028) + this checklist. Governance docs (CLAUDE.md, ADR, DDS, engineering standards) remain **frozen and untouched** by implementation, per the v1.0 change-control rule. A fact lives in one place; reports cite, they do not duplicate.
- **One non-blocking documentation follow-up (human's call):** the recommended one-line pointer in `implementation-strategy.md` (Sprint 0 = Phase-0-remaining + Phase 1 + IAM-infra) and recording the platform/auth adapters in `decision-log.md`/ADR — both are frozen-doc edits requiring approval (spec §3, §4 new-abstraction note). Neither blocks closure.
- **Evidence:** doc tree under `docs/sprints/`, `docs/architecture/decision-log.md`.

### 2.15 Development Workflow — 🟡 PARTIAL — git hooks are T-24 (Session 5)
- **In place now:** the lifecycle is documented and practiced (feature branches, Conventional Commits — see git log; squash-merge + human approval policy; docs-in-same-changeset). `pnpm verify` is the standard pre-commit verification command. Standard script surface present (`dev`/`build`/`lint`/`format`/`type-check`/`test`/`db:*`).
- 🔜 **Missing — Session 5 (T-24):** no `.husky/` directory exists; the **Husky + lint-staged pre-commit hook** (lint + format on staged files, fast; **no pre-push hook** per D-4) is not yet installed.
- **Evidence:** root `package.json` scripts; `git log` (Conventional Commits); absence of `.husky/` confirmed this session.

---

## 3. Pending for closure — this list IS the Session 5 scope

The checklist surfaces exactly three partial dimensions. Their gaps map 1:1 to the three Session 5 tasks, plus final verification and closure. **Session 5 closes precisely this set — no new product features.**

| # | Gap (from the dimension above) | Closing task | Dimension |
|---|---|---|---|
| 1 | Husky + lint-staged **pre-commit** hook (lint+format on staged; no pre-push) | **T-24** | 2.15 Development Workflow |
| 2 | **GitHub Actions** pipeline (Turbo gate + integration DB service + authz/no-literal gates), merge-blocking, **dormant-until-remote** | **T-25** | 2.12 Testing |
| 3 | **Full six-rule** fitness suite + platform-adapter rule + planted-violation tests, **CI-wired** | **T-27** | 2.13 Architectural Fitness Tests |
| 4 | Final end-to-end verification at the closing HEAD; **Sprint 0 Completion Report** | (Session 5 exit) | all |

> Two **accepted, non-blocking** follow-ups carry past Sprint 0 (not Session 5 scope): (a) evaluate Argon2id before production; (b) re-run automated `/security-review` once a git remote is configured (`session-3-verification-report.md §8`).

---

## 4. Platform Baseline (record only — NOT a gate)

A single-run snapshot captured at HEAD `8ec6cc2` for **future comparison only**. These are reference numbers, not thresholds; nothing passes or fails on them. Canonical figures are Turbo's / Vitest's / Playwright's own reported times (shell wall-clock noted where it adds spawn overhead).

**Environment:** Intel Core i7-13650HX (20 logical cores) · Node 20.20.0 · pnpm 9.15.4 · Turborepo 2.x · Windows 11 + Docker 27.4.0 · single run, no averaging.

| Metric | Cold (canonical) | Warm (cache-hot) | Notes |
|---|---|---|---|
| **Build time** | **20.85 s** (`turbo run build --force`, 5/5) | `29 ms` — FULL TURBO | wall-clock ≈ 23 s cold |
| **Verify time** (`build`+`lint`+`type-check`+`format:check`) | **≈ 24 s** (forced) | ≈ 4 s (only `format:check` runs) | **measured as** `turbo run build lint type-check --force` (gates parallelize) **+** a separate `prettier --check`. The real `pnpm verify` chains four *sequential* turbo invocations, so its true cold wall-time is somewhat higher — record this method for apples-to-apples future comparison. |
| **Dev startup time** | **≈ 1.96 s** ("Ready in" reported by Next) | — | `next dev`, wall-clock ≈ 3 s incl. process spawn |

**Test execution time** — recorded as three labeled sub-metrics (a single blended number would mislead this baseline). Full suite = **61 tests**, all green:

| Suite | Tests | Execution (canonical) | Requirements |
|---|---|---|---|
| Unit + architectural fitness (`turbo run test --force`) | 39 (11 files) | **7.58 s** (Vitest) | none; wall ≈ 9 s; warm = 28 ms FULL TURBO |
| Integration (`test:integration`) | 7 (2 files) | **4.11 s** (Vitest) | Docker test DB (:55433); wall ≈ 6 s |
| E2E (`test:e2e`, Playwright) | 15 | **27.2 s** (single worker) | dev DB + dev server; wall ≈ 29 s |
| **Total** | **61** | **≈ 39 s** aggregate | — |

> E2E pins `workers: 1` (drives `next dev`; parallel workers race the cold route compile — report §8.7). A production-build E2E in CI (Session 5) could re-enable parallelism and change this number — expected, not a regression.

---

## 5. Verdict

**Sessions 1–4 are verified; the execution platform is structurally complete and sound across all 15 dimensions.** Twelve dimensions are fully verified ✅; three are 🟡 partial and carry *only* their named Session-5 task (T-24 hooks · T-25 CI gate · T-27 full fitness suite).

> **GATE RESULT: READY to enter Session 5 (the closing session).** Sprint 0 is **NOT yet closed.** Closure requires Session 5 to complete the three pending items above and a final end-to-end verification, after which the **Sprint 0 Completion Report** records the close. **No new product features are introduced in Session 5** — the §3 gap list is the whole of its scope.

> **STOP.** Per the directive, the next deliverable is the **Session 5 Release Hardening Plan** (scoped to exactly the §3 gaps), not implementation. Implementation of Session 5 awaits explicit human approval of that plan.
