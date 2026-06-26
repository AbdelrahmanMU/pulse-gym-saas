# Sprint 0 — Technical Specification
### PULSE Gym SaaS · The execution-platform sprint (no business features)

| | |
|---|---|
| **Status** | ✅ **APPROVED — final implementation contract (2026-06-26).** Decisions D-1…D-8 resolved (§4); **Platform Adapters (T-26)** and **Architectural Fitness Tests (T-27)** added. Implementation may begin per the §7 sequencing. *Scope: implementation refinements only — no architecture, business rule, DDS, or governance doc was changed.* |
| **Baseline** | Foundation v1.0 (frozen), tag `v0.1.0-foundation`. This spec plans implementation **within** the frozen foundation; it introduces **no** architectural change. |
| **Spec format** | Project Spec Kit = `feature-template.md` structure + `definition-of-ready.md` gate, adapted for a platform sprint (per-task fields per the task brief). |
| **Owning scope** | Cross-cutting platform / IAM infrastructure only. **No bounded-context feature is in scope.** |
| **References** | ADR, `monorepo-strategy.md`, `implementation-strategy.md`, `prisma-7-strategy.md`, `identifier-strategy.md`, `initial-migration-specification.md`, `authorization-architecture.md`, `security-guidelines.md`, `logging-observability.md`, `error-handling.md`, `testing-standards.md`, `code-style-guide.md`, Design System v1.1 + tokens + Component Catalog. |

> **This document is a contract, not an implementation.** It contains no source code, config files, or scaffolding. Each task describes the work to be performed *after* approval, with the fields the brief mandates. "Verification Steps" describe how the work will be checked at implementation time — nothing is executed here.

---

## 1. Sprint Objective

Establish the **technical execution platform** on which every feature phase is built: the monorepo + build pipeline, the Next.js app skeleton, the data layer (Prisma 7 + PostgreSQL + the initial migration), the design-system wiring, the cross-cutting runtime foundations (env, logging, errors, health), the **plumbing** for authentication and permission-based authorization, and the quality/automation gates (lint, format, tests, hooks, CI).

**Definition of Success (sprint-level):** a reviewer can start **any** Phase ≥ 4 feature with zero foundational questions; the repo builds green end-to-end; the database migrates and seeds cleanly; an authenticated, gym-scoped, permission-gated **placeholder** route renders in the application shell. (Mirrors `implementation-strategy.md` Phase 0 + Phase 1 success, extended with IAM infrastructure.)

---

## 2. Scope boundary (IN / OUT)

**IN — execution foundation only:**
- Repository, workspace, and build platform (monorepo, pnpm, Turborepo, shared packages, dev scripts).
- App skeleton (Next.js `web`, routing foundation, application shell).
- Data layer (Prisma 7 setup, PostgreSQL connection via Docker Compose, initial migration **execution** + foundational seed).
- Design system wiring (Tailwind v4, shadcn/ui, PULSE tokens/catalog integration).
- Cross-cutting runtime (Zod-validated env, structured logging, error boundary, health endpoint).
- **IAM plumbing:** Auth.js wired with a gym-scoped session shape; the `@pulse/auth` permission-check mechanism + the seeded permission/capability/role catalog; **one demonstrable protected, permission-gated placeholder route** proving the mechanism end-to-end.
- Quality gates (lint, format, testing framework, git hooks, CI).

**OUT — explicitly deferred (no business features; constitution §1, brief):**
- Any bounded-context feature: Members, Plans, Memberships, Payments, Dashboard, Notifications, Reporting (Phases 4–10).
- **Feature-complete Authentication** (Phase 2): full login/logout UX, password reset, invitation flows, multi-gym context switching. Sprint 0 builds only the plumbing + a single sign-in path sufficient to exercise protection.
- **Feature authorization gating** (Phase 3): gating real business actions. Sprint 0 proves the gate on a placeholder route only.
- Real domain logic in `@pulse/domain` (created when a feature needs it — A1).
- Production deployment hardening, observability platform, multi-branch UI (future).

---

## 3. Mapping to the frozen roadmap (reconciliation, not an edit)

This Sprint 0 deliberately **bundles** several roadmap phases into one platform sprint. The roadmap (`implementation-strategy.md`) is in the frozen v1.0 set and is **not edited here**; this table is the reconciliation. *Recommendation (human's call): add a one-line pointer to `implementation-strategy.md` noting Sprint 0 = Phase 0-remaining + Phase 1 + IAM-infra — a frozen-doc edit requiring approval per the v1.0 change-control rule.*

| Roadmap item | This Sprint 0 coverage |
|---|---|
| Phase 0 (Foundations) — monorepo skeleton, CI, env validation, tokens wired | T-01…T-05, T-12…T-15, T-25 |
| Phase 1 (Bootstrap) — app shell, Docker Compose (app+Postgres), Prisma client, seed, health | T-06…T-11, T-16…T-18 |
| Phase 2 (Authentication) — **foundation/plumbing only** | T-19 (full UX/flows deferred to Phase 2) |
| Phase 3 (Authorization) — **infrastructure only** | T-20 (feature gating deferred to Phase 3) |
| Phases 4–10 (features) | **Not in scope** |

> Phase-0 originals "confirm ADR-P decisions" and "produce the DDS" are **already complete** (decision-log through ADR-027; DDS frozen) — hence Sprint 0's remaining Phase-0 work is the skeleton/CI/env/tokens above.

---

## 4. Decisions — RESOLVED (approved 2026-06-26)

All decisions are resolved by the human; this spec is the **final implementation contract**. Refinements applied vs. the draft: **Pino** logging (D-2), **pre-commit-only** hooks (D-4), **axe-core CI/test-only** (D-5), **`@pulse/types` added** to the initial package set (D-7), an **Authentication Adapter** seam (D-8), plus two additions — **Platform Adapters** (T-26) and **Architectural Fitness Tests** (T-27). "Dep cost" notes new dependencies (all hereby **approved**).

| # | Decision | Resolution (approved) | Dep cost | Notes |
|---|---|---|---|---|
| **D-1** | Unit/integration test runner | ✅ **Vitest** (+ Testing Library) | + dev dep | Playwright (E2E) already approved. |
| **D-2** | Structured logger | ✅ **Pino** — a single logger utility in `lib/` wrapping Pino | **+ dep** | Production-ready structured JSON, child-logger request correlation, redaction, long-term maintainability. Replaces the draft's zero-dep wrapper. |
| **D-3** | Env validation | ✅ **Zod** env module (fail-fast; refuses to boot) | none | Zod already approved; satisfies `security-guidelines.md`. |
| **D-4** | Git hooks | ✅ **Husky + lint-staged**, **pre-commit ONLY** (lint + format on staged files). **No pre-push hook.** | + dev deps | Keep commits fast; heavier gates (type-check, tests, a11y, fitness) run in **CI**, not on commit. |
| **D-5** | a11y tooling | ✅ **axe-core** — **CI / test only**, never on commit | + dev dep | Per D-4, a11y is a CI/test gate, not a commit gate. |
| **D-6** | CI host | ✅ **GitHub Actions — DORMANT.** Prepare the pipeline; **do not overbuild** before the repo is actively used / a remote exists. | none (config) | Authored-but-dormant; minimal until in active use. |
| **D-7** | Initial shared packages | ✅ Create **`@pulse/config`, `@pulse/db`, `@pulse/auth`, `@pulse/design-tokens`, `@pulse/types`**. **Defer** `@pulse/ui`, `@pulse/domain`, `@pulse/utils`, `@pulse/validation` until a real feature needs them (YAGNI / A1). | none | `@pulse/types` added now as the home for shared contracts incl. the platform-adapter & auth-adapter **interfaces** (T-19/T-26). |
| **D-8** | Authentication | ✅ **Auth.js (Credentials) behind a replaceable Authentication Adapter.** Domain/business logic depends on the **adapter interface** (in `@pulse/types`), **never on Auth.js**. Future providers (Clerk, Supabase Auth, Keycloak…) swap by replacing the adapter implementation only. | none (Auth.js approved) | See T-19. |

> **New-abstraction note (D-8 + T-26).** The Authentication Adapter and the Platform Adapters are **platform boundaries** — explicitly *not* repositories, CQRS, or business-service layers — so they do **not** conflict with the ADR's "Prisma is the data layer / no Repository Pattern." They are approved here within this implementation contract. Recording them in `decision-log.md`/ADR is **recommended but the human's call** — governance docs are frozen and are **not** edited by this spec.

---

## 5. Guiding constraints (apply to every task)
- **No new dependency/abstraction/pattern without approval** (constitution §9); all such choices are in §4.
- **No business logic** in any Sprint 0 artifact; `@pulse/domain` stays empty until a feature needs it.
- **Dependency law** (`monorepo-strategy.md` §4): `apps → packages → lower packages`; `@pulse/ui` never imports `@pulse/db`; `@pulse/domain` stays framework-free; no cycles.
- **Authorization is permission-based, never role-based** (constitution §8); no `requireRole`/`role===`/`switch(role)` anywhere — including the IAM plumbing.
- **Tokens only**, **Catalog components only** for any UI (constitution §3).
- **Tenancy & money laws** are not exercised by features yet, but the platform must not violate them (e.g., env/log must never leak secrets; logs carry `gymId` not bodies).
- **Conventional Commits, small PRs, squash-merge, human-approved** (`git-workflow.md`); docs updated in the same change set.
- **Platform adapters (T-26) and the Authentication Adapter (D-8/T-19) are thin platform boundaries** — never repositories, CQRS, or business-service layers (consistent with the ADR). Domain/business code depends on the **interfaces** (`@pulse/types`), never on framework/runtime APIs (Auth.js, `Date.now()`, `crypto.randomUUID()`); enforced by the **architectural fitness tests (T-27)**.

---

## 6. Task breakdown

> Per the brief, every task includes: **Purpose · Dependencies · Implementation Notes · Acceptance Criteria · Definition of Done · Risks · Verification Steps · Rollback Considerations.** Where a field does not apply it is marked **N/A — <reason>** (never omitted). Unless stated otherwise, **Rollback = revert the task's PR** (greenfield, version-controlled; nothing in production), and the per-task **Definition of Done** is: the Acceptance Criteria hold; lint + type-check + build are green in CI; no new unapproved dependency; the relevant docs are updated in the same change set; the human accepts the PR. Business-feature DoD gates (P0 tenancy/invariant tests, a11y) are **N/A for non-UI platform tasks** and called out where they *do* apply (UI tasks T-08/T-14, IAM tasks T-19/T-20).

### Workstream A — Repository & Build Platform

#### T-01 · Monorepo scaffold
- **Purpose** — Establish the repository's physical structure (`apps/`, `packages/`, root tooling) per `monorepo-strategy.md` §6, so the AI always knows where code goes.
- **Dependencies** — None (repo already initialized at `v0.1.0-foundation`).
- **Implementation Notes** — Create the `apps/` and `packages/` directories and a root `package.json` (private, workspace root, no app deps). Relocate the existing root `prisma/`, `prisma.config.ts`, and `globals.css` into their owning workspaces during the relevant tasks (T-09 / T-14), not here. `docs/` stays at root. Describe-only: no files authored in this spec.
- **Acceptance Criteria** — Given the repo, when the structure is created, then `apps/` and `packages/` exist, the root is marked private, and `docs/` is untouched.
- **Definition of Done** — Structure matches `monorepo-strategy.md` §6; root builds (empty) green; docs note the layout.
- **Risks** — Over-scaffolding future apps (forbidden — `monorepo-strategy.md` §11). *Mitigation:* only `apps/web` is created; future apps remain documented-only.
- **Verification Steps** — Directory tree matches strategy §6; `pnpm -r list` shows only intended workspaces.
- **Rollback Considerations** — Revert PR (no data, no production).

#### T-02 · pnpm workspace configuration
- **Purpose** — Define the pnpm workspace so packages/apps link via `workspace:*` (ADR-015, `monorepo-strategy.md` §7).
- **Dependencies** — T-01.
- **Implementation Notes** — A `pnpm-workspace.yaml` enumerates `apps/*` and `packages/*`. Pin the pnpm version via `packageManager`. Internal packages are unversioned, linked by `workspace:*`. Node version pinned (`.nvmrc`/`engines`). Describe-only.
- **Acceptance Criteria** — Given the workspace file, when `pnpm install` runs, then all workspaces resolve and internal deps link via `workspace:*` with no external fetch of internal packages.
- **Definition of Done** — `pnpm install` succeeds; lockfile committed; workspace graph correct.
- **Risks** — Version drift between contributors. *Mitigation:* pin pnpm + Node.
- **Verification Steps** — `pnpm install` clean; `pnpm -r list` shows workspace links.
- **Rollback Considerations** — Revert PR.

#### T-03 · Turborepo configuration
- **Purpose** — Orchestrate build/lint/type-check/test with caching and correct task ordering (`monorepo-strategy.md` §8).
- **Dependencies** — T-02.
- **Implementation Notes** — A `turbo.json` defines pipeline tasks (`build`, `lint`, `type-check`, `test`, `dev`) with `dependsOn` ordering (a package builds before consumers) and appropriate `outputs`/cache. CI runs the Turbo pipeline; red blocks merge. Describe-only — no JSON authored here.
- **Acceptance Criteria** — Given the pipeline, when `turbo run build lint type-check test` runs, then tasks execute in dependency order and a second run is cache-hot (no rebuild of unchanged packages).
- **Definition of Done** — One command builds the world; cache works; CI consumes the same pipeline.
- **Risks** — Mis-declared task graph causing stale/incorrect caching. *Mitigation:* explicit `dependsOn`/`outputs`; verify cache correctness.
- **Verification Steps** — First run builds; repeat run reports cache hits; reorder check (changing a package rebuilds only it + consumers).
- **Rollback Considerations** — Revert PR.

#### T-04 · Shared packages (initial set)
- **Purpose** — Create the minimal justified package set (D-7) establishing the safety-critical boundaries early without premature extraction.
- **Dependencies** — T-02, T-03; **decision D-7 accepted**.
- **Implementation Notes** — Per D-7, create **five** packages: **`@pulse/config`** (shared TS/ESLint/Tailwind/Prettier config), **`@pulse/db`** (Prisma client + schema home — receives `prisma/` in T-09), **`@pulse/auth`** (permission keys + check logic — populated in T-20), **`@pulse/design-tokens`** (token source → `globals.css` — populated in T-14), and **`@pulse/types`** (shared, dependency-free contracts — the home for the **platform-adapter & Authentication-Adapter interfaces** of T-19/T-26, and derived shared types). Each has a single public entry; no deep imports; dependency law enforced. `@pulse/ui`, `@pulse/domain`, `@pulse/utils`, `@pulse/validation` are **deferred** (YAGNI / A1) and remain documented-only until a real feature needs them. Describe-only.
- **Acceptance Criteria** — Given the package set, when the workspace builds, then exactly the **five** D-7 packages exist with correct public entries and no forbidden/circular imports; the four deferred packages are absent.
- **Definition of Done** — Packages build; dependency-direction lint passes; D-7 (five-package set) recorded.
- **Risks** — Premature extraction (strategy §11) or, conversely, putting authz outside `@pulse/auth`. *Mitigation:* exactly the five-package D-7 set; authz only in `@pulse/auth`.
- **Verification Steps** — Build each package; run an import-boundary lint (no `apps`←`packages` violations, no `ui→db`); confirm the four deferred packages are not created.
- **Rollback Considerations** — Revert PR; no data.

#### T-05 · Development scripts
- **Purpose** — One predictable command surface for the AI/human (`dev`, `build`, `lint`, `format`, `type-check`, `test`, `db:migrate`, `db:seed`, `db:reset`).
- **Dependencies** — T-02, T-03 (and the tasks each script fronts).
- **Implementation Notes** — Root `package.json` scripts delegate to Turbo and to Prisma (via `prisma.config.ts`). Names match `naming-conventions.md` (kebab/verb-first script names). Describe-only.
- **Acceptance Criteria** — Given the scripts, when each is run, then it performs the documented action and exits non-zero on failure.
- **Definition of Done** — All scripts present, documented in repo README/onboarding; each works.
- **Risks** — Script/Turbo divergence. *Mitigation:* scripts call Turbo, not bespoke logic.
- **Verification Steps** — Run each script; confirm correct delegation and exit codes.
- **Rollback Considerations** — Revert PR.

### Workstream B — Application Skeleton

#### T-06 · Next.js application (`apps/web`)
- **Purpose** — The single MVP app (modular monolith) skeleton: Next.js 15 App Router, TypeScript strict, Server Components default (ADR-003).
- **Dependencies** — T-01…T-04.
- **Implementation Notes** — Create `apps/web` with App Router, `tsconfig` extending `@pulse/config`, strict TS (no `any`, no non-null `!`). Internal feature slices live under `apps/web` initially (A1). `globals.css` destined for `src/app/globals.css` (CLAUDE.md §12). No business routes. Describe-only.
- **Acceptance Criteria** — Given the app, when `pnpm dev` runs, then the dev server boots and a placeholder home route renders with no console errors; `type-check` passes under strict mode.
- **Definition of Done** — App boots; strict TS clean; lint clean.
- **Risks** — Strict-mode friction; RSC/Client boundary mistakes. *Mitigation:* Server Components default; client only where needed.
- **Verification Steps** — `pnpm --filter web dev` boots; `pnpm --filter web type-check` green; `pnpm --filter web build` green.
- **Rollback Considerations** — Revert PR.

#### T-07 · Routing foundation
- **Purpose** — The App Router layout/route skeleton (root layout, an authenticated `(app)` segment, a public `(auth)` segment) so features slot in predictably; `app/` is routing only (constitution §2).
- **Dependencies** — T-06; T-19 (protection wraps the authenticated segment); T-08 (shell renders inside it).
- **Implementation Notes** — Define route groups: a public group for sign-in, an authenticated group whose layout enforces session + establishes gym/branch context (wires to T-19). No business routes; only a placeholder protected page (used by T-20 to demo the gate). `app/` contains routing/layout only — no business logic. Describe-only.
- **Acceptance Criteria** — Given the route groups, when an unauthenticated user hits the authenticated segment, then they are redirected to sign-in; when authenticated, the placeholder renders within the shell.
- **Definition of Done** — Route groups exist; protection wiring present (depends on T-19); no business logic in `app/`.
- **Risks** — Business logic leaking into `app/`. *Mitigation:* routing-only rule; review.
- **Verification Steps** — Manual: unauth → redirect; auth → placeholder. Integration test of route protection (with T-19).
- **Rollback Considerations** — Revert PR.

#### T-08 · Application shell
- **Purpose** — The empty authenticated chrome (AppShell / Sidebar / TopBar) per the Component Catalog (`implementation-strategy.md` Phase 1), into which features render.
- **Dependencies** — T-07, T-14 (tokens/components), T-19 (session context for user display).
- **Implementation Notes** — Compose **only** Catalog components (AppShell/Sidebar/TopBar) using **only** tokens (constitution §3). Responsive reflow to one column; 3px accent-bar for active nav; focus ring per Design System v1.1 §7. No bespoke UI — if a needed shell component is missing from the Catalog, **STOP and request it** (constitution §3). Navigation links are placeholders (no feature routes yet). Describe-only.
- **Acceptance Criteria** — Given an authenticated session, when the app loads, then the shell renders with sidebar/topbar, is keyboard-navigable, reflows to one column on mobile width, and shows the signed-in user; no console errors.
- **Definition of Done (UI task — a11y applies)** — Catalog components only; tokens only (no literals); **accessibility gate (Design System v1.1 §7) passed** (keyboard, visible focus, contrast via `*-text`, reduced-motion, responsive); responsive verified; docs updated.
- **Risks** — Bespoke shell drift; missing Catalog component. *Mitigation:* Catalog-only; STOP-and-request if missing.
- **Verification Steps** — Render shell as seeded Owner; axe-core check passes; manual §7 checklist; mobile-width reflow check.
- **Rollback Considerations** — Revert PR.

### Workstream C — Data Layer

#### T-09 · Prisma 7 setup
- **Purpose** — Wire Prisma 7 into the monorepo per `prisma-7-strategy.md`: schema home, generator, `prisma.config.ts`, driver-adapter client singleton.
- **Dependencies** — T-04 (`@pulse/db`), T-15 (env for `DATABASE_URL`).
- **Implementation Notes** — Move `prisma/schema.prisma` + `prisma.config.ts` into `@pulse/db`; re-point the `prisma-client` generator `output` into the package (the strategy noted the path is provisional). Implement the **client singleton** with the `@prisma/adapter-pg` driver adapter (per `prisma-7-strategy.md` §5; verify the `PrismaPg` constructor signature against the installed v7 minor — flagged in that doc). `@pulse/db` is server-only; never imported by `@pulse/ui` (dependency law). Describe-only — no client code authored here. **Approved deps:** `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg` (Prisma 7 already approved via ADR-027).
- **Acceptance Criteria** — Given the setup, when `prisma validate` and `prisma generate` run, then the schema validates under Prisma 7 and the client generates to the package output; the client connects via the adapter using the validated env URL.
- **Definition of Done** — `validate`/`generate` green; singleton exported from `@pulse/db` public entry; UI cannot import it (boundary lint).
- **Risks** — Adapter constructor API drift across v7 minors; hot-reload duplicate clients in dev. *Mitigation:* verify adapter signature; guard the singleton.
- **Verification Steps** — `pnpm db:generate`; `prisma validate` (already passing at foundation) re-confirmed in-package; boundary lint blocks `ui→db`.
- **Rollback Considerations** — Revert PR; no DB state changed by setup alone.

#### T-10 · PostgreSQL connection (Docker Compose)
- **Purpose** — A reproducible local PostgreSQL 18 the app connects to (ADR-016 Docker Compose; the DB half now, the app container as part of the same Compose definition).
- **Dependencies** — T-09, T-15 (`DATABASE_URL`).
- **Implementation Notes** — A `docker-compose.yml` defines a PostgreSQL **18** service (named volume, healthcheck, port, credentials from env) and is the foundation for the app service (Phase-1 deployment). PG18 chosen for native `uuidv7()` (identifier-strategy §2). The app reads `DATABASE_URL` from the validated env module (T-15). Describe-only — no compose file authored here.
- **Acceptance Criteria** — Given Compose, when `docker compose up` runs, then a healthy Postgres 18 accepts connections and the app connects using the validated `DATABASE_URL`.
- **Definition of Done** — Compose brings up a healthy DB; the app's client connects; credentials come from env, never hardcoded.
- **Risks** — Secrets in compose/committed env; version mismatch (< 18 lacks `uuidv7()`). *Mitigation:* env-sourced secrets; pin `postgres:18`.
- **Verification Steps** — `docker compose up -d`; healthcheck green; a connectivity probe (e.g., `prisma migrate status`) reaches the DB.
- **Rollback Considerations** — `docker compose down -v` removes the local volume (local only; no production data).

#### T-11 · Initial migration execution + foundational seed
- **Purpose** — Materialize the database from the **already-specified** initial migration and load the foundational seed (DDS §16) — *execution* of `initial-migration-specification.md`, not re-design.
- **Dependencies** — T-09, T-10, T-15.
- **Implementation Notes** — Generate the migration from `schema.prisma` via Prisma Migrate, then **append the hand-authored SQL tail exactly as specified** in `initial-migration-specification.md` (extensions `pg_trgm`/`btree_gist`; partial uniques; GiST exclusion INV-13; CHECKs; trigram GIN) in the documented order. **Reference that spec — do not restate or re-derive its SQL.** Then run the **seed**: permissions, capabilities, system roles (Owner/Trainer assignable; dormant roles `is_assignable=false`), RolePermission mappings, one Gym + default Branch + Owner GymUser, and the reserved **`system-actor` User** (non-login, `is_active=false`, unusable hash). Seed ids are UUID v7. Describe-only.
- **Acceptance Criteria** — Given a fresh DB, when migrate + seed run, then all 17 tables + enums + every specified constraint/index exist, `prisma migrate status` is clean, and the seed rows are present (Owner can be looked up; permission catalog populated; `system-actor` exists).
- **Definition of Done** — Migration applies on a clean DB; raw-SQL tail present (constraints verifiable); seed idempotent and deterministic; matches the spec with zero deviation.
- **Risks** — Drift between schema and the hand-authored tail; non-idempotent seed; ordering hazard (extensions before dependents). *Mitigation:* follow the migration spec ordering; idempotent seed; verify constraints post-apply.
- **Verification Steps** — On a throwaway DB: run migrate + seed; query `pg_indexes`/`pg_constraint` to confirm the partial uniques, GiST exclusion, CHECKs, and trigram GIN exist; `prisma migrate status` clean; re-run seed → no duplicates.
- **Rollback Considerations** — Greenfield: drop/recreate the database and re-apply (migration spec §12). Prisma Migrate is forward-only — **never** edit a shipped migration; a correction is a new migration.

### Workstream D — Design System

#### T-12 · Tailwind CSS
- **Purpose** — Install and configure Tailwind v4 as the styling engine, driven entirely by PULSE tokens (constitution §3).
- **Dependencies** — T-06, T-04 (`@pulse/config`, `@pulse/design-tokens`).
- **Implementation Notes** — Tailwind v4 wired in `apps/web`; the theme is mapped from `@pulse/design-tokens`/`globals.css` via `@theme` (Design System v1.1) so tokens are exposed as utilities; **no literal colors/spacing/radii**. Shared Tailwind config lives in `@pulse/config`. Describe-only.
- **Acceptance Criteria** — Given Tailwind, when the app renders, then token-mapped utilities apply and no hardcoded design literals exist (lint/grep clean).
- **Definition of Done** — Tailwind builds; tokens exposed as utilities; no literals.
- **Risks** — Hardcoded values bypassing tokens. *Mitigation:* token-only lint/grep; review.
- **Verification Steps** — Build CSS; grep for hex/px literals in components (expect none); confirm utilities resolve to token values.
- **Rollback Considerations** — Revert PR.

#### T-13 · shadcn/ui installation
- **Purpose** — Install shadcn/ui as the primitive layer the PULSE Catalog is derived from (stack: "shadcn via PULSE").
- **Dependencies** — T-12.
- **Implementation Notes** — Initialize shadcn/ui configured to consume PULSE tokens (not its default theme); generated primitives are **restyled to tokens** and become the basis for `@pulse/ui` Catalog components (populated as features need them — A1). Sprint 0 installs the mechanism; it does not build the whole Catalog. Describe-only.
- **Acceptance Criteria** — Given shadcn/ui, when a primitive is added, then it renders using PULSE tokens (no default shadcn theme leakage) and passes the a11y baseline.
- **Definition of Done** — shadcn/ui initialized against tokens; one representative primitive verified token-driven.
- **Risks** — Default shadcn theme overriding PULSE; bespoke divergence. *Mitigation:* token-mapped config; Catalog governance.
- **Verification Steps** — Add a sample primitive; inspect computed styles resolve to tokens; axe-core baseline passes.
- **Rollback Considerations** — Revert PR.

#### T-14 · PULSE Design System integration
- **Purpose** — Wire the PULSE token implementation (`globals.css`) and Catalog conventions so all UI is consistent and accessible (Design System v1.1, tokens, Component Catalog).
- **Dependencies** — T-12, T-13, T-04 (`@pulse/design-tokens`).
- **Implementation Notes** — Move/own `globals.css` as the `@pulse/design-tokens` source; import at `src/app/globals.css`. Establish the token layers (primitives → semantic roles → Tailwind `@theme`) and the standing rules (status via `*-text` + icon + label; brand never readable text; mono-tabular numbers; focus = 2px ring + offset; reduced-motion). The Catalog components themselves are built **on demand** per feature (A1); Sprint 0 establishes the integration + verifies the token pipeline end-to-end on the shell (T-08). Describe-only.
- **Acceptance Criteria** — Given the integration, when the shell renders, then tokens load, semantic roles resolve in light/dark, and the §7 accessibility primitives (focus, contrast via `*-text`, reduced-motion) are present.
- **Definition of Done (UI task — a11y applies)** — Tokens load; no literals; **§7 gate passed** on the shell; light/dark verified; docs (token/Catalog references) updated.
- **Risks** — Token drift or literals creeping in; contrast regressions. *Mitigation:* token-only lint; axe-core; §7 manual checklist.
- **Verification Steps** — Load shell; toggle theme; axe-core + §7 checklist; grep no literals.
- **Rollback Considerations** — Revert PR.

### Workstream E — Cross-cutting Runtime Foundations

#### T-15 · Environment configuration (fail-fast, Zod-validated)
- **Purpose** — A single, **Zod-validated env module** that the app validates at startup and **refuses to boot** on missing/malformed vars (`security-guidelines.md`).
- **Dependencies** — T-06; **decision D-3 accepted**.
- **Implementation Notes** — A hand-rolled Zod schema (D-3, zero new dep) parses `process.env` once at startup, exposing a typed, frozen config; required vars include `DATABASE_URL`, `AUTH_SECRET`, and Auth.js settings. `NEXT_PUBLIC_`-prefixed only where truly public. Secrets never logged (T-16). A committed `.env.example` documents required vars (no real secrets). Describe-only — no env files or schema authored here.
- **Acceptance Criteria** — Given a missing/invalid required var, when the app starts, then it fails fast with a clear message and does **not** serve; given valid env, it boots and exposes typed config.
- **Definition of Done** — Startup validation enforced; typed config exported; `.env.example` present; no secret committed.
- **Risks** — Secrets committed; client exposure of server secrets. *Mitigation:* `.gitignore` `.env*`; `NEXT_PUBLIC_` discipline; review.
- **Verification Steps** — Unit test: invalid env → throws/refuses boot; valid env → parses. Confirm `.env` is git-ignored.
- **Rollback Considerations** — Revert PR.

#### T-16 · Logging foundation
- **Purpose** — One structured logger utility (no scattered `console.log`) emitting JSON-per-line with the standard fields (`logging-observability.md`).
- **Dependencies** — T-06; **decision D-2 accepted (Pino)**.
- **Implementation Notes** — A single logger utility in `lib/` built on **Pino** (D-2): structured JSON, one event per line, the standard fields `{ timestamp, level, message, code, correlationId, gymId, branchId, userId, module, durationMs? }`. Per-request **correlation id** via a Pino **child logger** threaded through the request (e.g., AsyncLocalStorage). **Pino `redact`** configured for secrets/PII (passwords, tokens, full payment data, raw bodies) — **ids, not bodies**. Levels error/warn/info/debug mapped to the error taxonomy (`error-handling.md`); production logs `info`+. App code calls the wrapper, not Pino directly, so the logger stays swappable; `console.log` forbidden in committed code (lint-enforced). Describe-only — no logger code authored here.
- **Acceptance Criteria** — Given the logger, when an event is logged, then it is one Pino JSON line with the standard fields and correct level; secrets/PII are redacted (never present); `console.log` is absent from committed code.
- **Definition of Done** — Pino-based logger utility in place; child-logger correlation threading wired; **`redact` configured and verified**; lint forbids `console.log`.
- **Risks** — Secret/PII leakage; mis-scoped redaction paths. *Mitigation:* explicit `redact` paths + a test asserting no secret appears in output; ids-only policy; review.
- **Verification Steps** — Unit test: log output shape + fields + level; log an object containing a secret → assert it is redacted; lint catches a planted `console.log`.
- **Rollback Considerations** — Revert PR.

#### T-17 · Error boundary
- **Purpose** — A consistent failure surface: React error boundaries (Catalog `ErrorState`) + a boundary error-handling pattern that maps typed errors to safe UI/HTTP, never swallowing errors (`error-handling.md`).
- **Dependencies** — T-08 (Catalog `ErrorState`), T-16 (log at the boundary).
- **Implementation Notes** — App Router `error.tsx`/global error boundary renders the Catalog `ErrorState` with a recovery action and an abbreviated correlation id; the boundary maps the typed error taxonomy (Validation/Auth/Authorization/NotFound/Conflict/Application/Unexpected) to user-safe messages; full context is logged once at the boundary (T-16). **No empty `catch {}`**; no stack/SQL/internal ids leaked to users; cross-tenant → 404 (not 403). Describe-only.
- **Acceptance Criteria** — Given an unexpected error, when it reaches the boundary, then the user sees a calm `ErrorState` with a recovery path + correlation id, and full context is logged server-side once; no internal detail is exposed.
- **Definition of Done (UI surface — a11y applies to ErrorState)** — Error boundary renders Catalog `ErrorState`; taxonomy mapping present; one-log-at-boundary; §7 gate on the error UI; no silent swallow.
- **Risks** — Leaking internals; duplicate logging; dead-end errors. *Mitigation:* taxonomy mapping; log-once; `ErrorState` requires a recovery action.
- **Verification Steps** — Trigger a forced error → `ErrorState` renders with correlation id; logs show one error entry with full context; assert no stack/SQL in the response.
- **Rollback Considerations** — Revert PR.

#### T-18 · Health endpoint
- **Purpose** — A liveness/readiness endpoint for the container/orchestrator (`logging-observability.md` §Monitoring; Phase-1 health check).
- **Dependencies** — T-06, T-09/T-10 (DB readiness probe).
- **Implementation Notes** — A public, unauthenticated Route Handler (e.g., `/api/health`) returns liveness and a lightweight DB-connectivity readiness signal; **no business data, no secrets**, minimal payload. Used by Compose/orchestrator healthchecks. Describe-only.
- **Acceptance Criteria** — Given the endpoint, when the app and DB are healthy, then it returns a success status; when the DB is unreachable, readiness reflects unhealthy; the payload exposes no sensitive data.
- **Definition of Done** — Endpoint live; liveness + readiness behavior correct; payload safe; wired to Compose healthcheck.
- **Risks** — Leaking environment/diagnostic detail; expensive health checks. *Mitigation:* minimal payload; cheap probe.
- **Verification Steps** — `curl /api/health` → success; stop DB → readiness degrades; inspect payload for safety.
- **Rollback Considerations** — Revert PR.

### Workstream F — IAM infrastructure (plumbing only)

#### T-19 · Authentication foundation (behind a replaceable Authentication Adapter)
- **Purpose** — Wire authentication **behind a replaceable Authentication Adapter** (Auth.js as the MVP implementation) so a seeded staff user can sign in and obtain a **gym/branch-scoped session**, with route protection — the *plumbing* for Phase 2. **Domain/business logic never depends on Auth.js directly** (D-8).
- **Dependencies** — T-04 (`@pulse/types` for the adapter interface), T-06, T-07, T-11 (seeded Owner + `User`), T-15 (`AUTH_SECRET`), T-16; **decision D-8 accepted**; **mandatory security review** (R6).
- **Implementation Notes** — Define an **Authentication Adapter** contract (interface in **`@pulse/types`**, e.g., `AuthenticationAdapter`: sign-in, sign-out, get-current-session/principal, verify-credentials) and implement it in `apps/web` with **Auth.js v5 + Credentials provider** validating email + `User.passwordHash` (hashing via the platform/Auth.js — never custom crypto, `security-guidelines.md`). The session carries the active **gym/branch context**; the authenticated route segment's layout enforces an authenticated, gym-scoped session. **Application/domain code consumes the adapter + `ICurrentUser` (T-26), never Auth.js APIs directly** — so a future provider (Clerk/Supabase/Keycloak) is swapped by replacing only the adapter implementation. The adapter returns a **domain-shaped principal** (no Auth.js types leaking out). **Scope limit:** one working sign-in + sign-out + protection path; full UX (reset, invitations, multi-gym switch) is **deferred to Phase 2**. `auth.login` emits an audit/info log (T-16). Describe-only — no auth code authored here.
- **Acceptance Criteria** — Given the seeded Owner, when they sign in with valid credentials, then a gym-scoped session is established and protected routes render; with invalid credentials, sign-in is rejected (`401`/AuthError); unauthenticated access redirects to sign-in; **business/domain code references the adapter interface, with zero `next-auth`/Auth.js imports outside the adapter implementation** (fitness-test verified — T-27).
- **Definition of Done (security-critical)** — Auth.js wired (no custom auth/crypto) and **confined behind the Authentication Adapter**; session carries gym/branch context; protection enforced at the segment layout; **no Auth.js import outside the adapter** (T-27); **P1 authn tests** (unauthenticated rejection) pass; **security review passed** (R6); secrets via env only.
- **Risks** — **Auth misconfiguration (Critical, R6);** leaky abstraction (Auth.js types bleeding into domain); tenant context not established early. *Mitigation:* Auth.js only; adapter returns domain-shaped principal; **T-27 bans Auth.js imports outside the adapter**; server-side enforcement; mandatory security review; env-sourced secrets.
- **Verification Steps** — Integration tests: valid login → session+context; invalid → rejected; unauth → redirect. Fitness test: no `next-auth` import outside the adapter. Security review checklist (`security-guidelines.md`). Confirm no custom crypto.
- **Rollback Considerations** — Revert PR. Because this touches the security perimeter, re-review on any revert/re-land; rotate `AUTH_SECRET` if it was ever exposed.

#### T-20 · Permission-based authorization infrastructure
- **Purpose** — Establish `@pulse/auth` as the **sole** authorization home: the permission catalog (seeded), the `hasPermission(session, key)` check, and a server-side permission-gate — proving the mechanism on one placeholder route. **No role-name logic, ever** (constitution §8).
- **Dependencies** — T-04 (`@pulse/auth`), T-11 (seeded permissions/capabilities/roles/mappings), T-19 (session); **mandatory security review** (R6); **Phase-3 feature gating deferred**.
- **Implementation Notes** — In `@pulse/auth`: define permission **keys** (immutable, INV-7) and the capability→permission and role→permission mappings as **data** (seeded in T-11; resolution may be cached per session, DDS §6); implement the permission-check used by the mutation pipeline (`authenticate → authorize(by permission) → …`). Provide a server-side gate helper for Route Handlers/Server Actions. **Demonstrate** by gating the placeholder protected route on a representative permission (e.g., a `dashboard.view`-style key) — **no business action is gated yet**. Authorization logic exists **only** here; no app/other package re-implements it. **Forbidden:** `requireRole`, `role===`, `switch(role)` — a grep must find zero. Describe-only.
- **Acceptance Criteria** — Given a session with/without the required permission, when the gated placeholder route is accessed, then access is allowed/denied **by permission** (denied → 403, cross-tenant → 404); dormant roles exist but are unassignable; a grep finds **zero** role-name conditionals; **tests assert on permissions, not roles**.
- **Definition of Done (security-critical)** — `@pulse/auth` is the only authz home; permission-check + gate implemented; placeholder route gated by permission; **P1 authorization tests assert on permissions**; **zero role-name branches** (grep-verified); **security review passed**.
- **Risks** — **Accidental role-coupling (the #1 drift risk);** authz logic leaking outside `@pulse/auth`; missing a gate. *Mitigation:* permission-only checks; single authz home; grep gate in CI; security review.
- **Verification Steps** — Tests: permission present → allowed; absent → denied; dormant role unassignable. CI grep asserts no `requireRole`/`role ===`/`switch(role)`. Security review.
- **Rollback Considerations** — Revert PR; re-review on re-land (security perimeter). Permission **keys are immutable** — never rename on rollback; add a new key instead (INV-7).

### Workstream G — Quality Gates & Automation

#### T-21 · Linting
- **Purpose** — Authoritative ESLint enforcing TS-strict, import boundaries (dependency law), and the project's hard prohibitions (no `console.log`, no role-name branching, no literals) (`code-style-guide.md`).
- **Dependencies** — T-04 (`@pulse/config`), T-06.
- **Implementation Notes** — Shared ESLint config in `@pulse/config`; rules include strict TS, import/boundary rules (no `apps←packages`, no `ui→db`, no cycles), no `console.log`, and custom guards (grep/lint) for role-name branching and design literals. ESLint is authoritative — never hand-format against it. Describe-only.
- **Acceptance Criteria** — Given the config, when `lint` runs, then violations (boundary breach, `console.log`, role-name branch, literal) fail the run; clean code passes.
- **Definition of Done** — Shared lint config; CI runs it; representative violations are caught.
- **Risks** — Rules too weak to catch drift. *Mitigation:* include boundary + role + literal guards; test with planted violations.
- **Verification Steps** — Plant a `console.log`, a `role ===`, a `ui→db` import, a hex literal → lint fails each; remove → passes.
- **Rollback Considerations** — Revert PR.

#### T-22 · Formatting
- **Purpose** — Deterministic formatting via Prettier so diffs are clean and style debates are zero (`code-style-guide.md`).
- **Dependencies** — T-04 (`@pulse/config`).
- **Implementation Notes** — Shared Prettier config in `@pulse/config`, integrated with ESLint (no rule conflicts); a `format` script and a check mode for CI/hooks. Describe-only.
- **Acceptance Criteria** — Given the config, when `format --check` runs, then unformatted code fails and formatted code passes; ESLint and Prettier do not conflict.
- **Definition of Done** — Prettier config shared; `format` + check wired; no ESLint/Prettier conflicts.
- **Risks** — Formatter/linter conflicts. *Mitigation:* eslint-config-prettier (or equivalent) to disable conflicting rules.
- **Verification Steps** — `format --check` on a mis-formatted file fails; after `format`, passes; lint still green.
- **Rollback Considerations** — Revert PR.

#### T-23 · Testing framework
- **Purpose** — Stand up the test toolchain so P0/P1 tests can be written from Phase 4 on: unit/integration runner, E2E, a11y, and a containerized test DB (`testing-standards.md`).
- **Dependencies** — T-03, T-10; **decisions D-1, D-5 accepted**.
- **Implementation Notes** — **Vitest** (D-1) for unit/integration (+ Testing Library for components); **Playwright** (already approved) for E2E; **axe-core** (D-5) for a11y; integration tests run against a **containerized Postgres** with deterministic seed + reset-between-tests. Tests live beside the code they cover; Turbo runs them; **red CI blocks merge**. No feature tests yet — Sprint 0 delivers the *framework* + a smoke test per level (e.g., env-validation unit test, health-endpoint integration test, a trivial E2E that loads sign-in). Describe-only.
- **Acceptance Criteria** — Given the toolchain, when `test` runs, then unit/integration/E2E/a11y suites execute via Turbo, the smoke tests pass, and the integration suite uses an isolated test DB reset between tests.
- **Definition of Done** — All four test levels runnable in CI; smoke tests green; test DB isolation works; framework documented.
- **Risks** — Flaky integration/E2E from shared DB state. *Mitigation:* per-test reset; deterministic seed; small E2E suite.
- **Verification Steps** — Run each level locally + in CI; confirm DB reset isolation; confirm red test blocks merge.
- **Rollback Considerations** — Revert PR.

#### T-24 · Git hooks (pre-commit only)
- **Purpose** — A **fast pre-commit gate** so trivially-broken code never lands, keeping commits quick (`git-workflow.md`, `code-style-guide.md`). **No pre-push hook** (D-4) — heavier gates run in CI.
- **Dependencies** — T-21, T-22; **decision D-4 accepted**.
- **Implementation Notes** — **Husky + lint-staged** (D-4): a single **pre-commit** hook runs **lint + format on staged files only** (fast). **No pre-push hook** — type-check, the full test suite, a11y (axe-core, D-5), and the architectural fitness tests (T-27) run in **CI** (T-25), not on commit, to keep commit operations fast. `--no-verify` discouraged; commit messages follow Conventional Commits. Describe-only.
- **Acceptance Criteria** — Given a staged lint/format violation, when committing, then it is blocked locally and the commit stays fast; a clean commit passes quickly; **no pre-push hook exists** (pushing is not gated locally).
- **Definition of Done** — Husky installed on `pnpm install`; **pre-commit only** (lint + format, staged); **no pre-push hook**; commits remain fast; heavier gates delegated to CI; Conventional Commits documented.
- **Risks** — Hooks slowing commits (*mitigation:* staged-only, lint+format only); local gaps vs CI (*accepted:* CI is the backstop per D-4/D-6); bypass culture (*mitigation:* `--no-verify` discouraged).
- **Verification Steps** — Commit a staged lint error → blocked fast; confirm **no** pre-push hook fires on `git push`; clean commit passes quickly.
- **Rollback Considerations** — Revert PR; hooks are local DX — disabling them changes no production state.

#### T-25 · CI configuration
- **Purpose** — A pipeline that runs the Turbo gate (build, lint, type-check, test) on every PR; **red blocks merge** (`testing-standards.md`, `monorepo-strategy.md` §8).
- **Dependencies** — T-03, T-21…T-24; **decision D-6 accepted**.
- **Implementation Notes** — **GitHub Actions** (D-6) workflow runs `pnpm install` + the Turbo pipeline with remote/loca caching, a Postgres service for integration tests, and the **authz grep gate** (zero role-name branches) + the **no-literal** check. **No git remote exists yet** → the workflow is **authored-but-dormant** until a remote/host is chosen (flagged in D-6). Branch protection requires green CI before squash-merge. Describe-only — no YAML authored here.
- **Acceptance Criteria** — Given a PR (once a remote exists), when CI runs, then build/lint/type-check/test + the authz/literal gates execute, a red result blocks merge, and Turbo caching speeds reruns.
- **Definition of Done** — CI workflow defined; runs the full gate; integration DB service wired; merge-blocking on red; dormant-until-remote noted.
- **Risks** — CI green-but-incomplete (missing a gate); secrets in CI. *Mitigation:* include authz/literal/test gates; CI secrets via host secret store, never committed.
- **Verification Steps** — On first remote push: open a PR with a planted violation → CI red, merge blocked; clean PR → green. Until then: validate the workflow definition by inspection/act-style dry run.
- **Rollback Considerations** — Revert PR; CI config change affects no production state.

### Workstream H — Architecture Hardening

#### T-26 · Platform Adapters
- **Purpose** — Introduce **lightweight platform-boundary abstractions** so business/domain code depends on stable interfaces, not framework/runtime APIs — improving testability (deterministic time/ids) and provider-swap. **Platform boundaries only — NOT repositories or business services** (Additional Requirement 1).
- **Dependencies** — T-04 (`@pulse/types` hosts the interfaces); T-19 (`ICurrentUser` is sourced from the Authentication Adapter session).
- **Implementation Notes** — Define **interfaces in `@pulse/types`**: **`IClock`** (`now()`, gym-tz `today(tz)` per time-rules), **`IIdGenerator`** (`newId()` → UUID v7 per identifier-strategy), **`ICurrentUser`** (the authenticated principal: `userId` + gym/branch context + resolved permissions, sourced from the Authentication Adapter — T-19). Concrete implementations live in `apps/web` (system clock; `uuidv7` generator; Auth.js-session-backed `ICurrentUser`) until a second consumer justifies extraction (A1). **`IFileStorage` is DEFERRED** — there is **no MVP consumer**; it is documented as a future platform adapter and introduced only when file storage is actually needed (the brief: "do not introduce unnecessary abstractions"). Each adapter is tiny (a few methods); do **not** wrap concerns that don't cross a platform boundary. *Note:* row PKs are still generated by Prisma `@default(uuid(7))`; `IIdGenerator` is for **app-side** id needs (pre-generation, dedupe/correlation keys, deterministic test ids), not a duplicate of the DB default. Describe-only — no adapter code authored here.
- **Acceptance Criteria** — Given the adapters, when domain/app code needs time / id / current-user, then it depends on the `@pulse/types` interface and tests can inject deterministic fakes; **no direct `Date.now()` / `crypto.randomUUID()` / Auth.js calls in domain code** (fitness-test verified — T-27); `IFileStorage` is absent (deferred).
- **Definition of Done** — `IClock`, `IIdGenerator`, `ICurrentUser` interfaces in `@pulse/types`; implementations in `apps/web`; injectable fakes usable in tests; **exactly these three** (no over-abstraction; `IFileStorage` deferred); T-27 bans raw platform calls in domain.
- **Risks** — Over-abstraction / adapter sprawl (*mitigation:* exactly three, platform-only, `IFileStorage` deferred, brief's "no unnecessary abstractions"); leaky abstraction (*mitigation:* interfaces return domain-shaped values, not framework types).
- **Verification Steps** — Unit tests inject a fake clock/id → deterministic output; fitness test (T-27) finds no raw `Date.now`/`randomUUID`/Auth.js in domain; confirm `IFileStorage` not created.
- **Rollback Considerations** — Revert PR; interfaces/implementations are additive — no production state.

#### T-27 · Architectural Fitness Tests
- **Purpose** — Automated **architecture-conformance checks that fail CI on drift**, protecting the frozen architecture over months of AI development (Additional Requirement 2).
- **Dependencies** — T-04, T-21 (ESLint), T-23 (Vitest), T-25 (CI). New dev deps approved as part of this requirement.
- **Implementation Notes** — Two layers. **(a) Lint-time** via ESLint: `import/no-cycle` (no circular deps), an import-boundary plugin (e.g., `eslint-plugin-boundaries`) for layer/context direction, and `no-restricted-imports` for `@pulse/ui`→`@pulse/db` and `next-auth`/Auth.js outside the Authentication Adapter. **(b) A dedicated architectural fitness test suite** (Vitest) that statically asserts the rules ESLint can't easily express — using a dependency-graph tool (e.g., **dependency-cruiser**) and/or AST (e.g., `ts-morph`). **Rules enforced (the brief's list + D-8):** ① no circular dependencies · ② no direct role checks (`requireRole`/`role ===`/`switch(role)`) · ③ no cross-context violations (a context never imports another context's internals) · ④ no `@pulse/ui` → `@pulse/db` (UI never touches the DB) · ⑤ no hardcoded permission names (permission strings must reference the `@pulse/auth` key constants, never raw literals) · ⑥ no Auth.js import outside the Authentication Adapter (D-8). Runs in **CI** (T-25); **red blocks merge**. Describe-only — no rules authored here.
- **Acceptance Criteria** — Given a planted violation of **each** rule (a cycle; a `role ===`; a cross-context import; a `ui→db` import; a raw permission-string literal; an Auth.js import in domain), when the fitness suite + lint run, then **each** fails; a clean codebase passes.
- **Definition of Done** — Fitness suite + lint rules in place; **all six rule classes** covered; wired into CI (merge-blocking); each rule proven by a planted-violation test; consolidates the role-name grep gate from T-20/T-25.
- **Risks** — Incomplete rules giving false confidence (*mitigation:* a planted-violation test per rule); maintenance cost (*mitigation:* declarative, few, high-value rules).
- **Verification Steps** — Plant each of the six violations → the corresponding check fails; remove → passes; confirm CI executes the suite and blocks merge on red.
- **Rollback Considerations** — Revert PR; the fitness suite is tooling — no production impact (but removing it re-opens drift risk — re-land promptly).

---

## 7. Sequencing (dependency order)

```
T-01 ─► T-02 ─► T-03 ─► T-04 ─► T-05
                         │
                         ├─► T-06 ─► T-07 ─► T-08
                         │         (T-19 protects; T-14 styles)
                         ├─► T-09 ─► T-10 ─► T-11
                         ├─► T-12 ─► T-13 ─► T-14
                         ├─► T-15 ─► T-16 ─► T-17 ─► T-18
                         ├─► T-19 ─► T-20            (need T-11 seed, T-15 env)
                         │     └─► T-26              (platform adapters; ICurrentUser ← T-19)
                         └─► T-21 ─► T-22 ─► T-23 ─► T-24 ─► T-25 ─► T-27
                                                                  (fitness tests, CI-run)
```
- **Gate order matters:** env (T-15) precedes anything reading config; Prisma/DB (T-09/10) precede migration (T-11); seed (T-11) precedes auth/authz (T-19/20); lint/format/test (T-21–23) precede hooks/CI (T-24/25).
- T-19 and T-20 are **security-reviewed** and may proceed in parallel with the design-system stream but must land before the placeholder protected route is considered "done."
- **T-26** (platform adapters) needs `@pulse/types` (T-04) and T-19 (for `ICurrentUser`). **T-27** (fitness tests) needs ESLint (T-21), Vitest (T-23), and CI (T-25), and consolidates the role-name grep gate; it lands last so it can assert against the whole platform.

### 7.1 Session delivery plan (work partitioning)

The 27 tasks are delivered across **5 implementation sessions**, each a coherent, independently-verifiable milestone that respects the §7 dependency order. **Implement one session at a time; do not begin the next until the current session's exit criteria are met and verified.** Security-reviewed work (T-19/T-20) is isolated to Session 3.

| Session | Theme | Tasks | Exit criteria (all must hold) |
|---|---|---|---|
| **Session 1** | **Workspace & Build Platform** | **T-01, T-02, T-03, T-04, T-05, T-21, T-22** | `pnpm install` clean; `turbo run build lint type-check` green + cache-hot on rerun; the **five** D-7 packages (`config, db, auth, design-tokens, types`) exist with correct public entries and passing boundary lint (deferred packages absent); `format --check` works; dev scripts run. **No app / DB / auth / UI yet.** |
| **Session 2** | App, Data & Runtime Foundations | T-06, T-09, T-10, T-11, T-15, T-16, T-18, T-23 | App boots (strict TS); Zod env fail-fast; Pino logging + redaction; `docker compose up` → healthy Postgres 18; migrate + seed clean (`prisma migrate status` clean; Owner + permission catalog + `system-actor` seeded); `/api/health` green; Vitest/Playwright/axe-core toolchain + containerized test DB run. |
| **Session 3** | IAM & Platform Adapters | T-07, T-19, T-20, T-26 | Routing groups + protection; Auth.js **behind the Authentication Adapter** (no Auth.js outside it); gym-scoped session; `@pulse/auth` permission check + gated placeholder route (allow/deny **by permission**); `IClock`/`IIdGenerator`/`ICurrentUser` in `@pulse/types` with fakes; **security review passed**; zero role-name branches. |
| **Session 4** | Design System, Shell & Errors | T-12, T-13, T-14, T-08, T-17 | Tailwind v4 + shadcn on PULSE tokens; `globals.css` integrated; authenticated **app shell** renders (Catalog + tokens; **a11y §7 gate**); error boundary → Catalog `ErrorState` + correlation id; no literals. |
| **Session 5** | Hooks, CI & Architectural Fitness | T-24, T-25, T-27 | Husky **pre-commit-only** (lint+format, fast); GitHub Actions pipeline (dormant) runs the Turbo gate + integration DB; **architectural fitness tests** enforce all six rules (planted-violation tests pass); red blocks merge. |

> **Session 1 is the current target.** It is pure tooling/scaffolding — no runtime, DB, auth, or UI — so it is fully verifiable in isolation and carries no security review. Each later session builds on the verified prior one. *(This is a delivery-planning partition of the approved work; it changes no task, decision, or scope.)*

> **Refinement (2026-06-26):** Foundational architectural fitness rules from T-27 are pulled forward into Session 2's delivery — specifically the ESLint-layer rules (dependency boundaries, deep-import ban, circular-dependency guard, role-name authz guard, hardcoded-permission-string guard) and an initial Vitest architectural fitness suite written alongside T-23. This is a delivery-order adjustment only; T-27's task scope, full CI wiring, and Session 5 assignment are unchanged. Canonical record: `docs/sprints/session-progress.md` and `docs/sprints/session-2-execution-plan.md`.

---

## 8. Sprint-level acceptance (Definition of Success, expanded)
- `pnpm install` + `turbo run build lint type-check test` green from a clean checkout; cache-hot on rerun.
- `docker compose up` yields a healthy Postgres 18; `db:migrate` + `db:seed` produce the full schema (incl. raw-SQL constraints) and the foundational seed; `prisma migrate status` clean.
- The app boots; the **authenticated, gym-scoped** shell renders for the seeded Owner; an **unauthenticated** request is redirected; a **permission-gated** placeholder route allows/denies **by permission**.
- `/api/health` returns healthy; structured **Pino** logs emit with correlation ids and **redacted secrets** (none leaked); a forced error renders the Catalog `ErrorState` and logs once.
- **Authentication is confined behind the Authentication Adapter** (no Auth.js import outside it); **platform adapters** (`IClock`/`IIdGenerator`/`ICurrentUser`) exist in `@pulse/types` with injectable fakes; `IFileStorage` deferred.
- **Architectural fitness tests (T-27) pass in CI** — no circular deps, no role checks, no cross-context violations, no `@pulse/ui`→`@pulse/db`, no hardcoded permission names, no Auth.js outside the adapter; **red blocks merge**.
- Git hooks are **pre-commit only** (lint + format on staged files); type-check/tests/a11y/fitness run in CI.
- CI gate (incl. the fitness rules + **no design literals**) is wired and merge-blocking (dormant until a remote exists).
- **Accessibility gate (Design System v1.1 §7)** passes on the shell + error UI (axe-core in CI/test, not on commit).
- **Security review passed** for T-19/T-20.

---

## 9. Sprint-level risks
| Risk | Impact | Mitigation |
|---|---|---|
| Auth misconfiguration (R6) | Critical | Auth.js only; server-side enforcement; **mandatory security review**; env-sourced secrets |
| Accidental role-coupling (#1 drift risk) | High | Permission-only checks; `@pulse/auth` sole home; **architectural fitness test (T-27)** asserts zero role-name branches + no hardcoded permission names |
| **Architecture drift over time** | High | **Architectural fitness tests (T-27)** fail CI on cycles / role-checks / cross-context / `ui→db` / hardcoded-permissions / Auth.js-leak |
| Auth provider lock-in | Med | **Authentication Adapter** seam (D-8); domain depends on the interface; T-27 bans Auth.js outside the adapter |
| Over-abstraction / adapter sprawl | Med | Platform-only adapters (exactly 3; `IFileStorage` deferred); "boundaries, not repositories"; brief's "no unnecessary abstractions" |
| Premature package extraction / over-scaffolding | Med | D-7 five-package set; deferred packages documented-only (A1, strategy §11) |
| Unapproved new dependency slipping in | Med | All new deps gated in §4; DoR STOP on unapproved libs |
| Schema ↔ raw-SQL-tail drift in the migration | Med | Execute `initial-migration-specification.md` verbatim; verify constraints post-apply |
| Secret/PII leakage via logs/env/health | High | ids-not-bodies logging; Zod env fail-fast; minimal health payload; review |
| Scope creep into business features | Med | §2 OUT list; "no business features" is the sprint's hard line |

---

## 10. Definition of Ready check (this spec) & approval gate

| DoR item | Status |
|---|---|
| Business rules identified | N/A — platform sprint, no business rules (constitution §1: no features). |
| Workflow / owning context | IAM-infra + cross-cutting; owning contexts are platform/IAM (`bounded-contexts.md`). |
| Acceptance criteria (testable) | ✅ per task + §8. |
| Permissions named, no role logic | ✅ T-20 (permission-based; zero role-name branches). |
| Design components (Catalog) | ✅ T-08/T-14 (Catalog + tokens only; STOP-and-request if missing). |
| Reused modules/tokens | ✅ tokens, `@pulse/*` per D-7; nothing duplicated. |
| Validation rules (Zod) | ✅ T-15 env; feature validation deferred (no features). |
| Error cases | ✅ T-17 taxonomy (`error-handling.md`). |
| Edge cases | Platform-level (env-missing, DB-down, unauth, missing-permission) enumerated per task. |
| Testing plan | ✅ T-23 + per-task verification (P1 authn/authz; smoke per level). |
| Dependencies & new libraries | ✅ **§4 resolved (approved 2026-06-26):** Vitest, Pino, Zod, Husky+lint-staged (pre-commit only), axe-core (CI/test), GitHub Actions (dormant), five packages incl. `@pulse/types`, Auth.js-behind-adapter; fitness-test deps (ESLint plugins, dependency-cruiser/ts-morph) approved with T-27. |
| Documentation | ✅ this spec + per-task doc updates; roadmap pointer flagged (not edited); governance docs untouched. |
| Review approval | ✅ **Approved 2026-06-26** with the D-1…D-8 resolutions + Platform Adapters (T-26) + Architectural Fitness Tests (T-27). |

**Gate:** This spec is **APPROVED and Ready** — implementation may begin per the §7 sequencing. The new abstractions (Authentication Adapter, platform adapters) and the fitness-test dependencies are **approved within this contract**; they are platform boundaries that introduce no architectural/DDS/governance change (governance docs remain frozen and untouched). Sprint 0 implementation proceeds per `development-workflow.md`.

---

*This Sprint 0 Technical Specification is the **approved** implementation contract for the execution-platform sprint. It plans work within the frozen Foundation v1.0; it does not implement, scaffold, or author any code/config. Refinements of 2026-06-26 (D-1…D-8 + T-26/T-27) are implementation-level only — no architecture, business rule, DDS, or governance document was changed.*
