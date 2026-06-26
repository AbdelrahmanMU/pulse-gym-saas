# Session 2 Execution Plan — App, Data & Runtime Foundations

> **Status: DRAFT — awaiting human approval before implementation begins.**
> No source code, config files, or scaffolding is produced in this document.
> All task definitions, decisions, and acceptance criteria are in
> `sprint-0-technical-specification.md`; this plan documents execution strategy only.

| | |
|---|---|
| **Session** | 2 of 5 |
| **Theme** | App, Data & Runtime Foundations |
| **Spec tasks** | T-06, T-09, T-10, T-11, T-15, T-16, T-18, T-23 |
| **Additional (pull-forward)** | Foundational architectural fitness rules from T-27 — ESLint layer + initial Vitest suite (delivery-order adjustment, not a scope change; see refinement note in spec §7.1) |
| **Prerequisite** | Session 1 exit criteria all green ✅ (verified — `session-progress.md`) |

---

## 1. Objectives

By the end of Session 2 a reviewer can:

1. Boot the Next.js 15 app (`apps/web`) under strict TypeScript with no compiler errors.
2. Confirm that a missing or malformed required environment variable **prevents the app from booting** (Zod fail-fast).
3. Observe that all server-side log output is structured JSON (Pino) with standard fields and that secrets/PII are **absent** from log output.
4. Run `docker compose up -d` and reach a healthy PostgreSQL 18 instance.
5. Apply the initial migration and seed (`pnpm db:migrate && pnpm db:seed`) and verify the full schema (17 tables + enums + raw-SQL constraints/indexes) and the foundational seed rows (permissions, capabilities, system roles, one Gym/Branch/Owner, `system-actor`) exist.
6. Hit `/api/health` and receive a success response; stop the DB and observe a degraded-readiness response.
7. Run the Vitest, Playwright, and axe-core test suites and see smoke tests pass against an isolated containerized test DB.
8. Confirm that the ESLint fitness rules (dependency boundaries, deep imports, circular deps, role-name guards, hardcoded permission strings) are active and catch planted violations.

No auth, no UI shell, no design system — those are Sessions 3 and 4.

---

## 2. Implementation order

Dependencies from the spec `§7` graph determine strict sequencing within the session.
Where tasks have no mutual dependency, they may be partially parallelised, but the
listed groups provide the safe sequential order.

### Group 1 — App skeleton (unblocks everything)

**T-06: Next.js application (`apps/web`)**

Create `apps/web` with App Router, `tsconfig` extending `@pulse/config/tsconfig.base.json`,
strict TS (no `any`, no `!`). A single placeholder home route (`/`) renders; `pnpm dev`
(via `turbo run dev`) starts without errors. No business routes, no business logic.

*Carry-forward note:* The five `@pulse/*` packages built in Session 1 export from `./dist`.
The Next.js app must consume them correctly — either via Turborepo `dependsOn: ["^build"]`
(ensuring packages build before the app) or via `transpilePackages` in `next.config.ts`.
Verify this ordering is correct before adding any package imports to the app.

### Group 2 — Environment validation (unblocks Prisma, logging, auth)

**T-15: Zod-validated env module**

A hand-rolled Zod schema in `apps/web` (no new dep — Zod is approved) parses
`process.env` at startup. Required vars minimally: `DATABASE_URL`, `AUTH_SECRET`.
Missing or invalid → refuse to boot with a clear message. A committed `.env.example`
documents required vars. Real `.env` is git-ignored.

### Group 3 — Prisma 7 + PostgreSQL (unblocks migration/seed and health endpoint)

These two tasks are tightly coupled; implement in order.

**T-09: Prisma 7 setup in `@pulse/db`**

Move `prisma/schema.prisma` and `prisma.config.ts` from the repo root into
`packages/db/`. Re-point the `prisma-client` generator `output` to the package's
`dist/`. Implement the **client singleton** with `@prisma/adapter-pg` — guard against
hot-reload duplicate instances in dev. Verify the `PrismaPg` constructor signature
against the installed v7 minor (flagged as a risk in the spec). `@pulse/db` is
server-only; confirm the boundary lint blocks `@pulse/ui` → `@pulse/db` imports.

**T-10: PostgreSQL 18 via Docker Compose**

A `docker-compose.yml` at the repo root defines the `postgres:18` service (named
volume, healthcheck, env-sourced credentials). Pin to `postgres:18` — PG18 is
required for native `uuidv7()` (identifier-strategy §2). No credentials hardcoded.
The app reads `DATABASE_URL` from the env module (T-15).

### Group 4 — Migration + seed (unblocks auth/authz in Session 3)

**T-11: Initial migration execution + foundational seed**

Execute `initial-migration-specification.md` exactly:

1. Generate the migration from `prisma/schema.prisma` via `prisma migrate dev`.
2. Append the **hand-authored raw-SQL tail** verbatim from the spec: extensions
   (`pg_trgm`, `btree_gist`), partial unique indexes, GiST exclusion (INV-13),
   CHECK constraints, trigram GIN index — in the documented order.
3. Run the seed: permissions, capabilities, system roles (`Owner`/`Trainer` assignable;
   dormant roles `is_assignable=false`), RolePermission mappings, one Gym + default
   Branch + Owner GymUser, and the reserved `system-actor` User (non-login,
   `is_active=false`, unusable password hash). All seed PKs are UUID v7.

Seed must be idempotent (safe to re-run). `prisma migrate status` must be clean.
After apply, spot-check `pg_indexes`/`pg_constraint` for the partial uniques, GiST
exclusion, CHECKs, and trigram GIN.

### Group 5 — Cross-cutting runtime (can proceed after T-06 + T-15)

These two tasks depend on T-06 and T-15 but not on the DB tasks; they may be
implemented in parallel with Groups 3–4.

**T-16: Pino structured logging**

A single logger utility in `apps/web/lib/` (or `apps/web/src/lib/`) wrapping Pino:

- Standard fields: `{ timestamp, level, message, code, correlationId, gymId, branchId, userId, module, durationMs? }`
- Per-request child logger threaded via `AsyncLocalStorage` for correlation
- Pino `redact` configured for secrets/PII paths (passwords, tokens, auth headers, raw bodies) — ids only, never bodies
- Lint rule already in place: `no-console` is a lint error; all output goes through this logger

**T-18: Health endpoint**

A public, unauthenticated Route Handler at `/api/health`. Returns liveness + a
lightweight DB-connectivity readiness probe (cheap query, e.g., `SELECT 1`).
Payload exposes no secrets, no env values, no stack traces — minimal JSON only.
Wired to the Docker Compose `healthcheck`.

### Group 6 — Testing toolchain + fitness rules (after T-10 for containerized DB)

**T-23: Vitest / Playwright / axe-core toolchain**

- **Vitest** for unit and integration tests (+ Testing Library for components when UI
  lands in Session 4); integration tests run against a containerized Postgres with
  deterministic seed + reset-between-tests (separate from the dev DB).
- **Playwright** for E2E (framework configured; a trivial smoke test: load the
  placeholder `/` route).
- **axe-core** integrated with Vitest/Playwright for a11y assertions (CI/test only,
  not on commit per D-5); baseline: no a11y errors on the placeholder page.
- Turbo pipeline: `test` task runs via `turbo run test`; red blocks merge (in CI).
- Smoke tests: one unit (env validation), one integration (health endpoint against
  the test DB), one E2E (placeholder route loads).

**T-27 pull-forward — Foundational fitness rules**

Established in this session so that all Session 2–4 code is covered from day one.

*ESLint layer (extends the T-21 config already in `@pulse/config`):*

| Rule | What it catches |
|---|---|
| `import/no-cycle` | Circular dependencies between modules |
| `eslint-plugin-boundaries` (or equivalent) | Layer-direction violations (`apps ← packages`; `@pulse/ui` → `@pulse/db`) and deep-import ban (no `@pulse/auth/internal/...`) |
| `no-restricted-syntax` (AST) | Role-name authorization checks: `requireRole(`, `role ===`, `switch(role)` |
| `no-restricted-imports` | Direct Auth.js imports outside the Authentication Adapter path (added here for readiness, enforced in Session 3 when Auth.js is introduced) |
| Grep / `no-restricted-syntax` | Hardcoded permission-string literals (raw strings instead of `@pulse/auth` key constants) |

*Vitest fitness suite (alongside T-23):*

A dedicated `fitness/` test directory (or `__tests__/fitness/`) using a dependency
graph tool (e.g., `dependency-cruiser` or `ts-morph`) to assert the rules that ESLint
cannot easily express — primarily: no cycles across the full graph, and no cross-context
internal imports. These run as part of `turbo run test`.

Verify each rule by planting a representative violation, confirming the check fails,
then removing the violation and confirming it passes.

*Scope note:* This is the ESLint layer + initial Vitest suite from T-27. Full CI wiring
(T-25) and the complete six-rule suite with merge-blocking remain in Session 5 as
specified.

---

## 3. Dependencies and carry-forward items

| Item | Source | Impact on Session 2 |
|---|---|---|
| Five `@pulse/*` packages with `./dist` exports | Session 1 (T-01…T-04) | `apps/web` must consume packages via built `dist/`; Turbo `dependsOn: ["^build"]` or Next.js `transpilePackages` must be confirmed before any package import in the app |
| ESLint config in `@pulse/config` | Session 1 (T-21) | Session 2 extends this config with the pulled-forward fitness rules; no re-work of existing rules |
| `prisma/schema.prisma` + `prisma.config.ts` at repo root | Session 1 scaffold | T-09 moves these into `packages/db/`; repo root is left clean |
| `globals.css` at repo root | Session 1 scaffold | Stays at root until T-14 (Session 4) moves it to `packages/design-tokens/` |
| Approved deps (already in scope) | Sprint 0 spec §4 | Prisma 7 / `@prisma/adapter-pg` / `pg` / Pino / Zod / Vitest / Playwright / axe-core / Docker Compose — all approved; no new dep requests needed for Session 2 |
| Dependency-cruiser / ts-morph (fitness-test tooling) | Sprint 0 spec §T-27 | Approved with T-27; introduced as dev-deps in Session 2 for the pulled-forward fitness suite |

---

## 4. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Prisma 7 `PrismaPg` constructor API drift across v7 minors | Med | Pin the exact `@prisma/adapter-pg` version in `@pulse/db`; verify the constructor signature immediately on install (flagged in T-09) |
| Dev-mode hot reload creating multiple Prisma client instances | Med | Singleton guard using `globalThis` (or Node `global`) to reuse the client across hot-reload cycles |
| Migration raw-SQL tail drift from `initial-migration-specification.md` | Med | Execute the tail verbatim from the spec; verify constraints post-apply via `pg_indexes`/`pg_constraint` queries |
| Non-idempotent seed causing duplicate-key errors on re-run | Med | Use `upsert` / `createMany` with `skipDuplicates` or `ON CONFLICT DO NOTHING`; verify by running the seed twice |
| PostgreSQL 18 not available on the local Docker host | Low | `postgres:18` is on Docker Hub; document the version requirement clearly; fail-loud if pulled image is older |
| Containerized test DB isolation flakiness (shared state between tests) | Med | Per-test transaction rollback or per-suite DB reset; deterministic seed ensures known start state |
| `exports`-field package resolution in Next.js app | Med | Confirm `turbo run build` with `dependsOn: ["^build"]` builds packages before `apps/web`; if Next.js can't resolve `dist/`, add `transpilePackages` in `next.config.ts` as the fallback |
| Scope creep into Session 3 concerns (auth, routing, protection) | Low | Placeholder home route only; no route groups, no auth wiring — those land in Session 3 (T-07, T-19) |

---

## 5. Acceptance criteria

Standard exit criteria are in `sprint-0-technical-specification.md` §7.1 Session 2 row.
This plan adds the pull-forward fitness criteria:

### From spec §7.1 (Session 2 exit criteria)

- App boots; strict TS clean; `pnpm verify` green
- Zod env fail-fast: missing `DATABASE_URL` → refuses to boot with clear message
- Pino logging: structured JSON output; secrets redacted (verified by unit test)
- `docker compose up` → Postgres 18 healthy
- `pnpm db:migrate` + `pnpm db:seed`: all 17 tables + enums + raw-SQL constraints present; `prisma migrate status` clean; seed rows queryable; seed idempotent
- `/api/health`: healthy DB → success; DB down → readiness degraded; no secrets in payload
- Vitest/Playwright/axe-core: smoke tests pass; containerized test DB isolation confirmed

### Additional (fitness pull-forward)

- ESLint fitness rules active: planted circular-dep, deep-import, role-name branch, hardcoded-permission-string violations each cause `pnpm lint` to fail; clean code passes
- Initial Vitest fitness suite: dependency-graph checks pass on the Session 2 codebase; planted cycle fails the suite

---

## 6. Session 2 exit gate

Session 3 may not begin until all criteria in §5 hold and a human approves
the Session 2 output. Security-sensitive work (T-19, T-20, T-26) is isolated
in Session 3 and receives a mandatory security review before landing.

---

*This is an execution plan, not an implementation contract. Task definitions, scope,
decisions, and acceptance criteria are authoritative in `sprint-0-technical-specification.md`.
Produce no code, no config, and no scaffold until this plan is approved.*
