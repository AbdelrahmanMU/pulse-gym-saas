# Sprint 0 — Session Progress

Authoritative per-session closure record for Sprint 0.
See `sprint-0-technical-specification.md` for the full task definitions and exit criteria.

---

## Session 1 — Workspace & Build Platform

| Field | Value |
|---|---|
| **Status** | ✅ Completed / Verified / Approved |
| **Approval date** | 2026-06-26 |
| **Branch** | `feat/platform-foundation` (renamed from `feat/sprint-0-session-1-build-platform`) |
| **Commit** | `chore(platform): establish monorepo foundation` |
| **Tasks** | T-01, T-02, T-03, T-04, T-05, T-21, T-22 |

### Acceptance criteria — all satisfied

| Criterion | Evidence |
|---|---|
| `pnpm install` clean; workspace resolves | Verified. `pnpm -r list` shows all five packages linked via `workspace:*`. |
| `turbo run build lint type-check` green | Verified. Full Turbo pipeline completes with no errors. |
| Turbo cache-hot on rerun | Verified. Second run reports cache hits for all unchanged packages. |
| Five D-7 packages exist with correct public entries | `@pulse/config`, `@pulse/db`, `@pulse/auth`, `@pulse/design-tokens`, `@pulse/types` — all present with single public entries; `@pulse/ui`, `@pulse/domain`, `@pulse/utils`, `@pulse/validation` absent. |
| Boundary lint passes | `no-console` / deep-import ban verified by planted violations (lint fails on violation; passes on clean code). |
| `format --check` works | Verified. `prettier --check .` exits 0 on clean repo. |
| Dev scripts run (dev/test no-op cleanly) | Verified. `dev` and `test` exit 0 silently; `db:*` commands are defined but dormant. |
| No app / DB / auth / UI introduced | Confirmed — Session 1 is pure tooling/scaffolding. |

### Stack versions (locked)

- pnpm 9.15.4 / Node 20.20.0
- Turborepo 2.10
- ESLint 9 flat config + typescript-eslint 8 strict
- Prettier 3.8
- TypeScript 5.9

### Session 1 refinements applied in closing commit

The following improvements were applied as part of Session 1 closure, all within the
existing `feat/platform-foundation` branch (no architectural change):

1. **@pulse/config responsibility** — `packages/config/README.md` documents that this package is shared tooling configuration ONLY; explicitly forbids helpers, utilities, constants, business code, and runtime logic.
2. **@pulse/types as sole shared-types package** — `packages/types/README.md` documents that `@pulse/types` is the only package for shared cross-package TypeScript types; lists what belongs and what does not.
3. **`pnpm verify` command** — added to root `package.json` (runs build → lint → type-check → format:check in sequence); documented in `README.md` as the standard pre-commit verification command.
4. **Fitness tests pulled forward** — a minimal pointer added to `sprint-0-technical-specification.md` §7.1; the foundational ESLint fitness rules and initial Vitest fitness suite are planned for Session 2 delivery alongside T-23. Canonical plan: `session-2-execution-plan.md`.
5. **Branch renamed** — `feat/sprint-0-session-1-build-platform` → `feat/platform-foundation`; Session 1 scaffold commit squashed with refinements into single commit `chore(platform): establish monorepo foundation`.
6. **This document created** — `docs/sprints/session-progress.md` (Session 1 closure record).
7. **Session 2 execution plan created** — `docs/sprints/session-2-execution-plan.md`; no code, no scaffold.

### Known follow-ups (non-blocking)

The five open ratifications from the database readiness report remain resolved
with defaults applied (per `docs/database/database-readiness-report.md`):
branding removed; R-1 index present; AuditLog.metadata nullable; Membership.created_by
mandatory (system-actor user); grace_period_days kept at default 0. None block Session 2.

### Deferred to Session 2

T-06, T-09, T-10, T-11, T-15, T-16, T-18, T-23 — plus the foundational fitness
rules from T-27 pulled forward into Session 2 delivery. See `session-2-execution-plan.md`.

**Branch status:** `feat/platform-foundation` — NOT merged to main.

---

## Session 2 — App, Data & Runtime Foundations

| Field | Value |
|---|---|
| **Status** | ✅ Completed / Verified — awaiting human acceptance |
| **Verified date** | 2026-06-26 |
| **Branch** | `feat/platform-foundation` (not merged) |
| **Tasks** | T-06, T-09, T-10, T-11, T-15, T-16, T-18, T-23 + foundational T-27 fitness rules (ESLint layer + initial Vitest suite) |
| **Report** | `docs/sprints/session-2-verification-report.md` (full criterion-by-criterion evidence) |

### Acceptance criteria — all satisfied (evidence in the verification report)

| Criterion | Result |
|---|---|
| App boots; strict TS; `pnpm verify` green | ✅ `next build` + full verify green; packages consumed via `dist` (no `transpilePackages`). |
| Zod env fail-fast (missing var → refuses to boot, clear message) | ✅ Reproduced: build refuses listing `DATABASE_URL`/`AUTH_SECRET`; no value leak. |
| Pino structured logging + redaction | ✅ Standard fields + `AsyncLocalStorage` correlation; secret redaction unit-verified. |
| `docker compose up` → healthy Postgres 18 | ✅ `postgres:18.4` healthy; native `uuidv7()` confirmed; host port 55432. |
| Migrate + seed clean; raw-SQL tail present; idempotent | ✅ `migrate status` clean; extensions/partial-uniques/GiST/CHECKs/trigram verified in-DB; 13 caps / 40 perms / 5 roles / 102 mappings / Gym+Branch+Owner+system-actor; re-run stable. |
| `/api/health` healthy→200, DB down→503, no secrets | ✅ Both paths reproduced. |
| Vitest / Playwright / axe-core + isolated test DB | ✅ 7 unit/fitness + 3 integration (test DB :55433) + 1 E2E (zero axe violations). |
| ESLint fitness rules catch planted violations | ✅ deep-import / role-name / hardcoded-permission fail `pnpm lint`; cycle caught by dependency-cruiser suite (see report §3.1 for the `import/no-cycle` Windows note). |
| Initial Vitest fitness suite | ✅ clean graph passes; planted cycle fails the suite. |

### Key decisions & deviations

1. **ADR-028 (seed role set)** — human-approved: seed Owner/Trainer (assignable) + Front Desk/Manager/Accountant (dormant); **Receptionist & Branch Manager not seeded** (no canonical permission matrix — strategic definitions, not seed data). DDS §16 seed line flagged for reconciliation. Recorded in `decision-log.md`.
2. **No new unapproved deps** — `dotenv`/`tsx`/`pino-pretty` avoided via Node built-ins (`process.loadEnvFile`, `--env-file`), a compiled seed, and plain Pino JSON.
3. **Prisma generator `importFileExtension="js"`** — so the tsc-built ESM client runs under Node (the seed runs as `node dist/seed.js`).
4. **Host DB ports 55432/55433** — avoid a native host PostgreSQL already bound to 5432.

### Known follow-ups (non-blocking)

- Owner User credential is a placeholder until auth lands (T-19, Session 3).
- `import/no-cycle` has a Windows/flat-config limitation; dependency-cruiser is the cross-platform cycle gate.
- App container + health-check wiring in Compose is a Phase-1 deployment item.

**Branch status:** `feat/platform-foundation` — NOT merged to main. Session 3 must not begin until human acceptance.

---

## Session 3 — IAM & Platform Adapters

| Field | Value |
|---|---|
| **Status** | 🔜 Pending |
| **Tasks** | T-07, T-19, T-20, T-26 |

---

## Session 4 — Design System, Shell & Errors

| Field | Value |
|---|---|
| **Status** | 🔜 Pending |
| **Tasks** | T-12, T-13, T-14, T-08, T-17 |

---

## Session 5 — Hooks, CI & Architectural Fitness

| Field | Value |
|---|---|
| **Status** | 🔜 Pending |
| **Tasks** | T-24, T-25, T-27 (full CI-wired suite; foundational rules established in Session 2) |
