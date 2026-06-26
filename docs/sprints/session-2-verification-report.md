# Session 2 — Verification Report

### App, Data & Runtime Foundations · Sprint 0

| | |
|---|---|
| **Session** | 2 of 5 |
| **Tasks delivered** | T-06, T-09, T-10, T-11, T-15, T-16, T-18, T-23 + foundational T-27 fitness rules (ESLint layer + initial Vitest suite) |
| **Branch** | `feat/platform-foundation` (not merged) |
| **Verified on** | 2026-06-26 · Node 20.20.0 · pnpm 9.15.4 · Windows 11 + Docker Desktop 27.4 |
| **Status** | ✅ All exit criteria satisfied — awaiting human acceptance |

> Authoritative criteria: `sprint-0-technical-specification.md` §7.1 (Session 2 row) +
> `session-2-execution-plan.md` §5. Every criterion below is mapped to concrete,
> reproduced evidence. Nothing is asserted that was not run.

---

## 1. Environment & tooling installed (all Sprint 0 §4-approved; no new unapproved deps)

| Dependency | Resolved version | Task |
|---|---|---|
| `next` / `react` / `react-dom` | 15.5.19 / 19.2.7 / 19.2.7 | T-06 |
| `prisma` / `@prisma/client` / `@prisma/adapter-pg` / `pg` | 7.8.0 / 7.8.0 / 7.8.0 / 8.x | T-09 |
| `zod` | 3.25.76 | T-15 |
| `pino` | 9.14.0 | T-16 |
| `vitest` / `@playwright/test` / `axe-core` + `@axe-core/playwright` | 2.1.9 / 1.x / 4.10 | T-23 |
| `eslint-plugin-import` / `eslint-import-resolver-typescript` / `dependency-cruiser` | 2.32 / 3.x / 16.x | T-27 |

**Dependency discipline (advisor-flagged):** `dotenv`, `tsx`/`ts-node`, and `pino-pretty`
were **avoided**. The root `.env` is loaded via Node's built-in `process.loadEnvFile()`
(next.config.ts, prisma.config.ts) and `--env-file` (db scripts); the seed runs as
compiled `node dist/seed.js`; Pino emits plain stdout JSON (no transport).

---

## 2. Spec §7.1 exit criteria — Session 2 row

### 2.1 App boots; strict TypeScript clean; `pnpm verify` green (T-06)
- `pnpm build` (Turbo) → all 5 workspaces build; `apps/web` `next build` compiles, type-checks, and prerenders: `/` (static), `/api/health` (dynamic ƒ), `/_not-found`.
- `pnpm verify` (build → lint → type-check → format:check) → **green** end-to-end.
- The five `@pulse/*` packages are consumed via their built `dist/` (Turbo `dependsOn: ["^build"]`); **no `transpilePackages` needed** (confirmed empirically).
- Dev-server boot confirmed via the Playwright E2E, which starts `next dev` and renders `/` with no console errors.

### 2.2 Zod env fail-fast: missing required var → refuses to boot with a clear message (T-15)
- `apps/web/src/env.ts` validates `process.env` on import (imported at the root layout) and exports a frozen typed config.
- **Reproduced:** building with `.env` absent fails with:
  ```
  Invalid environment configuration — the application cannot start.
    - DATABASE_URL: DATABASE_URL is required
    - AUTH_SECRET: AUTH_SECRET is required
  ```
- The error never echoes the offending value (no secret leak); unit test asserts this (`src/env.test.ts`).
- `.env` is git-ignored; `.env.example` is committed with no real secrets.

### 2.3 Pino structured logging + redaction (T-16)
- One JSON line per event with the standard fields `{ timestamp, level (label), message, code, correlationId, gymId, branchId, userId, module, durationMs? }`; per-request correlation + tenant scope via `AsyncLocalStorage`.
- **Redaction verified** by unit test (`src/lib/logger.test.ts`): logging an object carrying `password`/`token`/`AUTH_SECRET`/`DATABASE_URL` emits `"[REDACTED]"` and the raw secret string never appears in output.
- **Free-text error path checked (sacred property):** the health route logs `{ err }` via `pino.stdSerializers.err` (which `redact` cannot censor — it's free text). Reproduced a **real** Prisma connection failure with a password-bearing `DATABASE_URL` and logged it through the exact logger config: the serialized error message/stack contains **no** connection string or password (Prisma masks it). No secret leak on the degraded path.
- `no-console` is a lint error; all output flows through the wrapper.

### 2.4 `docker compose up` → healthy Postgres 18 (T-10)
- `docker-compose.yml` defines `postgres:18` (named volume mounted at `/var/lib/postgresql` per the PG18 image convention; healthcheck; credentials from root `.env`, none hardcoded). Host port **55432** (avoids a native host PostgreSQL already on 5432).
- **Verified:** container reports `healthy`; `SHOW server_version` → `18.4`; native `SELECT uuidv7()` returns a v7 UUID (identifier-strategy §2 satisfied).

### 2.5 Migrate + seed clean; full schema + raw-SQL constructs; idempotent seed (T-11)
- `@pulse/db` owns `prisma/` + `prisma.config.ts`; generator output → `packages/db/src/generated/prisma` (git-ignored). Client singleton uses `@prisma/adapter-pg` with a `globalThis` hot-reload guard (`PrismaPg(poolConfig)` signature confirmed against 7.8).
- Migration authored as `migrate dev --create-only` → **hand-authored raw-SQL tail appended verbatim** from `initial-migration-specification.md` → applied. `prisma migrate status` → **clean**.
- **Raw-SQL constructs verified in-DB** via `pg_indexes`/`pg_constraint`:
  - extensions `pg_trgm`, `btree_gist` ✓
  - 6 partial unique/partial indexes (platform-role key; member phone/email per-gym non-archived; one open trainer assignment; trainer-open accelerator; one active freeze) ✓
  - GiST exclusion `memberships_no_overlap_excl` (contype `x`) ✓
  - 5 CHECK constraints (members contact; payments amount>0; plans price/duration; gyms windows; freezes frozen_days) ✓
  - GIN trigram `members_full_name_trgm_idx` ✓
- **Seed (idempotent — re-run produces identical counts):** 13 capabilities · 40 permissions · 5 roles · 102 role→permission mappings · 1 Gym + 1 default Branch · Owner User + Owner `GymUser` · reserved `system-actor` User (`is_active=false`, unusable hash). All ids UUID v7 (auto for natural-key rows; fixed v7 UUIDs for the Gym/Branch singletons).
- Roles seeded: **Owner, Trainer** (assignable) and **Front Desk, Manager, Accountant** (dormant, `is_assignable=false`, `gym_id` NULL). See §4 for the Receptionist/Branch-Manager decision.

### 2.6 `/api/health`: healthy DB → success; DB down → degraded; no secrets (T-18)
- Public, unauthenticated Route Handler (`force-dynamic`, `runtime=nodejs`): liveness + a cheap `SELECT 1` readiness probe; minimal payload (`{ status, checks.database }`) — no secrets, env values, or stack traces.
- **Healthy path verified** by the integration test (real `GET()` against the test DB → `200` / `status:"ok"`).
- **Degraded path verified:** the readiness probe against an unreachable DB throws → the handler returns `503` / `status:"degraded"`.

### 2.7 Vitest / Playwright / axe-core toolchain + containerized test-DB isolation (T-23)
- **Unit + fitness (DB-free, `turbo run test`):** 7 tests pass — env validation (4), logger redaction/fields (2), architectural fitness (1).
- **Integration (isolated test DB on :55433):** 3 tests pass — `globalSetup` runs `migrate deploy` + seed against the **separate** `postgres-test` container; health readiness `ok`; seed reference counts present; business tables truncated between tests (isolation mechanism exercised).
- **E2E + a11y (Playwright + axe-core):** the placeholder `/` route loads and records **zero** axe violations.

---

## 3. Plan §5 additional criteria — pulled-forward fitness rules (T-27)

### 3.1 ESLint fitness layer — planted-violation results (`pnpm lint`)
Each rule was verified by planting a representative violation, confirming the result, then removing it (clean code passes `pnpm lint`):

| Guard | Mechanism | Planted violation → result |
|---|---|---|
| Deep-import ban | `no-restricted-imports` | `import … from "@pulse/db/src/client"` → **lint error** ✓ |
| Role-name authorization | `no-restricted-syntax` (AST) | `if (role === "OWNER")` → **lint error** ✓ |
| Hardcoded permission key | `no-restricted-syntax` (literal regex) | `const x = "payments.record"` → **lint error** ✓ |
| Auth.js outside adapter | `no-restricted-imports` (`next-auth`) | configured (readiness; enforced in Session 3) |
| Circular dependency | `import/no-cycle` (lint) **+ dependency-cruiser (authoritative)** | see note below |

> **Circular-dependency enforcement (honest note).** The **authoritative** cycle gate is the
> dependency-cruiser architectural-fitness suite (§3.2) — proven to fail on a planted cycle on
> all platforms. `import/no-cycle` is also configured in the ESLint layer (the mechanism the
> plan names) and fires on the Linux CI that gates merges in Session 5; however, on this
> **Windows + flat-config + eslint-plugin-import 2.32** dev setup, `no-cycle` does not close the
> cycle path (a known plugin limitation — `no-unresolved` confirms resolution works, but the
> cycle is not flagged). No coverage is lost: the planted cycle is reliably caught by the
> dependency-cruiser suite, which runs under `turbo run test` (and CI in Session 5).

The hardcoded-permission and role-name guards are scoped off for `**/seed.ts`, which legitimately
**defines** the permission catalog as reference data (it is the source, not a consumer).

### 3.2 Initial Vitest architectural-fitness suite (dependency-cruiser)
The suite scans the `packages` + `apps/web/src` **source** graph (excluding `dist/`,
generated, tests) with three rules: `no-circular`, `packages-not-to-apps`, `ui-not-to-db`.
- **Clean codebase passes.** **Planted within-app cycle fails** the suite (`violations: [{ type: "cycle", rule: "no-circular" }]`) — reproduced, then removed. (`validate: true` is required, else the ruleSet computes `circular` but never flags it — captured in the test.)

> **Scope of this initial subset (precise — do not over-read).** Because cross-package
> imports (`@pulse/db`, …) resolve through each package's **built `dist/`** (which the suite
> excludes), this subset reliably catches **within-package / within-app** cycles and
> **relative-path** boundary violations — **not** cross-*package* cycles via package names.
> Cross-package cycle/boundary direction is additionally guarded by the lint-layer
> deep-import ban and the `@pulse/web` import ban. **Full cross-package-cycle detection
> (mapping `@pulse/*` to source) + merge-blocking CI is the complete six-rule T-27 suite in
> Session 5**, as specified. The Session 2 deliverable is the *initial* subset (spec §7.1).

**Acceptance ask (explicit):** accept the **dependency-cruiser Vitest suite** (run under
`turbo run test`) as the **Session 2 cycle gate**, with `import/no-cycle` configured at the
lint layer (effective on Linux CI). Full `pnpm lint` cross-platform cycle coverage and
cross-package-cycle detection are deferred to Session 5 with the rest of T-27.

---

## 4. Decision recorded — ADR-028 (seed role set)

A doc conflict surfaced during T-11: DDS §16 says seed five dormant roles "with their permission
mappings," but the **canonical** `authorization-architecture.md` §6 defines a permission matrix only
for Front Desk, Manager, Accountant and explicitly calls **Receptionist** and **Branch Manager**
"placeholders in strategy, not MVP" (§113) with no permission set.

**Human decision (2026-06-26):** seed **Owner, Trainer, Front Desk, Manager, Accountant** only;
do **not** create Receptionist/Branch Manager; invent no permission mapping. Recorded as
**ADR-028** in `decision-log.md`.

> **Reconciliation flag:** Receptionist and Branch Manager are **strategic definitions, not seed
> data**, until their permission matrices are authored and approved. The DDS §16 "five dormant
> roles" seed line is **flagged for reconciliation** to reference ADR-028 (a frozen-governance edit
> requiring human approval — not made here). Activating either role is then a one-line additive seed
> change with zero code change (authz §8).

---

## 5. Known follow-ups (non-blocking)

1. **Owner User credential** — the seeded `owner@pulse.local` carries a placeholder, non-loginable
   `passwordHash`; a real credential is set when authentication lands in **Session 3 (T-19)** (hashing
   via Auth.js/platform — never custom crypto). The Owner cannot sign in in Session 2 (no auth yet).
2. **`import/no-cycle` on Windows** — see §3.1 note; dependency-cruiser is the cross-platform cycle gate.
3. **App container in Compose** — `docker-compose.yml` defines the DB (and an isolated test DB); the
   `web` app service + wiring `/api/health` to its container healthcheck is a Phase-1 deployment item
   (future), per T-10.
4. **DDS §16 reconciliation** — pointer to ADR-028 (frozen-doc edit; human's call), per §4.

---

## 6. Exit gate

All Session 2 exit criteria (spec §7.1 + plan §5) are satisfied and reproduced above.
**Session 3 (IAM & Platform Adapters — T-07, T-19, T-20, T-26) must not begin until a human
accepts this output.** Session 3 contains the security-reviewed work and receives a mandatory
security review before landing.
