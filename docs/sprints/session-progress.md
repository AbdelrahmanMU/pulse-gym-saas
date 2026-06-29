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
| **Commit** | `0b566d7` — `feat(platform): app, data & runtime foundations (Sprint 0 Session 2)` |
| **Tag** | `v0.2.0-platform` (annotated, on `0b566d7`) |
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
| **Status** | ✅ **Completed / Verified / APPROVED (2026-06-29).** Security gate PASSED at start; all exit criteria empirically reproduced; human-accepted. Committed on `feat/platform-foundation`; annotated tag **`v0.3.0-iam-foundation`**. |
| **Tasks** | T-07, T-19, T-20, T-26 |
| **Report** | `docs/sprints/session-3-verification-report.md` (criterion-by-criterion evidence) |
| **Accepted follow-ups** | (1) **Evaluate Argon2id before production release** — keep scrypt for Sprint 0; switch only with a compelling reason (KDF change needs rehash-on-next-login). (2) **Re-run automated `/security-review` after the first git remote is configured** — it could not run this session (no remote); a manual review was done. Both recorded in the report §8. |
| **Security gate** | ✅ **PASSED (2026-06-26)** — checklist reviewed + formally approved; "PASSED" = *authorized to begin*. `advisor` consulted twice on the security design (its blocking findings were acted on). **`/security-review` automated skill could not run (no git remote)** → a manual security review was performed (report §2; no critical/high). The checklist exit boxes are now resolved honestly (verified ✅ / mechanism-ready ~ / pending human acceptance). |
| **Approved decisions** | JWT session strategy; `crypto.scrypt` hashing (human-vetoable vs bcrypt/argon2); `@pulse/auth` pure-surface/server-subpath split + `@pulse/auth` as the single authorization catalog source the seed materializes (no `auth↔db` cycle); idempotent seed Owner hash from seed-scoped `OWNER_INITIAL_PASSWORD`; MVP branch = gym default branch; `assertSameGym→404` tenancy helper as the Session-3 isolation target. Full rationale in the checklist head note. |
| **Verification** | `pnpm -w run verify` green; **45 tests** — 33 unit/fitness, 7 integration (real test DB), 5 E2E (incl. full Owner sign-in → gated dashboard → sign-out). Stack added: `next-auth@5.0.0-beta.31`. |
| **Carry-in** | All three resolved: real Owner scrypt hash; `@pulse/auth` permission-key constants; `AuthenticationAdapter` interface in `@pulse/types` + scoped `next-auth` lint exception (subpath ban fixed). |

---

## Session 4 — Design System, Shell & Errors

| Field | Value |
|---|---|
| **Status** | ✅ **Completed / Verified / ACCEPTED (2026-06-29).** Plan approved 2026-06-29 with six quality refinements (R-1…R-6); implemented in order T-12→T-13→T-14→T-08→T-17; human-accepted. |
| **Tasks** | T-12 (Tailwind v4 on PULSE tokens), T-13 (shadcn primitives via PULSE), T-14 (design-system integration + `next/font`), T-08 (Application Shell), T-17 (error boundary + UI states) |
| **Plan / Report** | `session-4-ui-ux-execution-plan.md` (approved, §8 refinements) · `session-4-verification-report.md` (criterion-by-criterion evidence) |
| **Result** | `pnpm -w run verify` green; **61 tests** (39 unit/fitness incl. R-1 layering + R-3 token-compliance, 7 integration, 15 E2E incl. light+dark axe, keyboard/focus, responsive 375/768/1280, forced-error boundary). **Auth/authz perimeter untouched/frozen.** |
| **Stack added** | Tailwind v4 + `@tailwindcss/postcss`; shadcn-idiom primitives (Radix avatar/dialog/dropdown-menu/slot) restyled to PULSE tokens; `class-variance-authority`/`clsx`/`tailwind-merge`; `lucide-react`; `next/font` (Space Grotesk/Inter/JetBrains Mono). `globals.css` relocated to `@pulse/design-tokens`. |
| **Key deferrals** | Dark-mode toggle (light default; dark verified via `.dark`); data-bearing widgets (search/notifications/branch switch); `@pulse/ui` not created (components live in `apps/web`); sign-in left as-is. |

---

## Sprint 0 — Exit Checklist (gate into the closing session)

| Field | Value |
|---|---|
| **Status** | 🟡 **GATE PASSED — ready to enter Session 5.** Sessions 1–4 verified across all 15 dimensions; 12 ✅ verified, 3 🟡 partial (carrying only their named Session-5 task). Sprint 0 **NOT yet closed** — closure gated on Session 5 + the Completion Report. |
| **Document** | `sprint-0-exit-checklist.md` (dimension-by-dimension verification + Platform Baseline) |
| **Date** | 2026-06-29 · HEAD `8ec6cc2` · re-grounded: build 5/5, 61 tests green (39 unit/fitness + 7 integration + 15 E2E) |
| **Baseline (record only)** | build 20.85s · verify ≈24s · test exec ≈39s (7.58s unit/fitness + 4.11s integration + 27.2s E2E) · dev startup ≈1.96s |
| **Pending → Session 5 scope** | T-24 (pre-commit hook) · T-25 (CI gate) · T-27 (full six-rule fitness suite) · final verification · closure |

---

## Session 5 — Hooks, CI & Architectural Fitness (Release Hardening — the closing session)

| Field | Value |
|---|---|
| **Status** | 📋 **Plan prepared — awaiting human approval; not started.** |
| **Tasks** | T-24, T-25, T-27 (full CI-wired six-rule suite; foundational rules established in Session 2) |
| **Plan** | `session-5-release-hardening-plan.md` (scoped to exactly the Exit Checklist §3 gaps; **no new product features**) |
| **Closes** | Sprint 0 — followed by the **Sprint 0 Completion Report**, then Sprint 1 planning may begin. |
