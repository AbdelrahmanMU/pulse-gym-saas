# Session 5 — Verification Report

### Release Hardening: Hooks, CI & Architectural Fitness · Sprint 0

| | |
|---|---|
| **Session** | 5 of 5 — **the closing session** |
| **Tasks delivered** | T-24 (git hooks, pre-commit only), T-25 (CI configuration), T-27 (full six-rule architectural-fitness suite + the T-26 platform-adapter rule) |
| **Branch** | `feat/platform-foundation` (not merged) |
| **Verified on** | 2026-06-30 · HEAD `c6e9c45` · Node 20.20.0 · pnpm 9.15.4 · Windows 11 + Docker 27.4.0 · Next 15.5 · Tailwind v4 · React 19 |
| **Auth perimeter** | ✅ **Untouched / frozen.** No edit to `lib/auth/**` or `@pulse/auth`'s authorization surface; Session-3 authn/authz tests unchanged and green. (The shared ESLint config gained a `modules/**`-scoped rule only; no auth code changed.) |
| **Status** | ✅ All exit criteria satisfied and **empirically reproduced** — awaiting human acceptance |

> Authoritative criteria: `sprint-0-technical-specification.md` §7.1 (Session 5 row) + the T-24/T-25/T-27 task contracts + decisions **D-4/D-5/D-6**, scoped by the approved **Session 5 Release Hardening Plan** (= exactly the **Exit Checklist §3** gap list). Every claim maps to a reproduced result; the one dormant item (CI first-run) is stated as inspection-validated, never asserted as "executed".

---

## 0. What shipped (file map)

- **T-24 (hooks):** `.husky/pre-commit` (`pnpm lint-staged`); root `package.json` — `prepare: "husky"` + a `lint-staged` block (eslint --fix + prettier on staged `*.{ts,tsx}`, prettier on other staged text). Dev deps `husky@9.1.7`, `lint-staged@17.0.8`.
- **T-27 (fitness):** `apps/web/fitness/lint-rules.test.ts` (new — AST/import rules via the real ESLint config); `apps/web/fitness/architecture.test.ts` (extended — adds the cross-context graph rule + a planted-violation test per graph rule); `packages/config/eslint/index.mjs` (adds the `modules/**`-scoped platform-adapter raw-call ban).
- **T-25 (CI):** `.github/workflows/ci.yml` (two jobs: `gate` + `database`; dormant until a remote exists).

---

## 1. Acceptance Criteria (spec §7.1 Session 5 row + task ACs)

| Criterion | Result | Evidence |
|---|---|---|
| **T-24** Husky pre-commit-only; staged lint/format gate; **no pre-push hook**; commits fast | ✅ | `prepare: husky` installs hooks on `pnpm install`; `git config core.hooksPath` = `.husky/_`; `.husky/` contains **only** `pre-commit`. A planted staged `console.log` was **blocked** (`eslint … no-console` → lint-staged reverted → `husky - pre-commit script failed (code 1)`; HEAD unchanged). The real Session-5 commit ran the hook and passed. lint-staged runs only on staged files (fast). |
| **T-25** GitHub Actions runs the Turbo gate + integration DB service + authz/no-literal gates; **red blocks merge**; dormant-until-remote | ✅ (authored; inspection-validated) | `.github/workflows/ci.yml`: `gate` = build/lint/type-check/format:check/unit+fitness; `database` = integration + E2E against a `postgres:18` service. YAML parses (prettier). authz role-name + no-literal gates are **consolidated into** the unit+fitness run (T-27 + token-compliance) per T-27 DoD — no separate grep step. No remote exists → never executed (D-6); first run deferred to remote setup. |
| **T-27** Fitness suite enforces **all six rules + the platform-adapter rule**; **planted-violation test per rule**; CI-wired; consolidates role-name grep | ✅ | 56 unit/fitness tests green (was 39). Each rule has a planted violation (must flag) **and** a clean case (must pass) — see §2. Runs under `turbo run test`, wired into the CI `gate` job. |
| Final: `pnpm verify` green; full suite green; auth/authz unchanged | ✅ | `pnpm verify` green; **78 tests** green (56 unit/fitness + 7 integration + 15 E2E). Session-3 auth/authz tests unmodified and green. |

---

## 2. T-27 — the seven rules, each proven by a planted-violation test

**Two enforcement layers, split by reliability on this platform** (per the known Windows/flat-config limitation where `import/no-cycle` does not fire — dependency-cruiser is the cross-platform cycle gate; recorded since Session 2 §3.1):

**Layer (a) — AST / import-specifier rules** proven by running the **real shared ESLint config** through the ESLint Node API (`lint-rules.test.ts`). This proves the rule is *wired and fires*, not a re-implemented regex:

| Rule | Planted violation → flagged | Clean / allowed case → passes |
|---|---|---|
| ② no role checks | `requireRole(...)`, `role === "…"`, `switch(role)` → `no-restricted-syntax` | permission-based code (no role branch, no key literal) |
| ⑤ no hardcoded permission keys | `const k = "payments.record"` → `no-restricted-syntax` | reference to the `@pulse/auth` key constants |
| ⑥ no Auth.js outside the adapter | `import … "next-auth"` / `"next-auth/jwt"` in `modules/**` → `no-restricted-imports` | the **same import inside `lib/auth/**`** is allowed (adapter exception) |
| + platform-adapter (T-26) | `Date.now()`, `new Date()`, `randomUUID()` in `modules/**` → `no-restricted-syntax` | the **same calls inside `lib/platform/**`** (the adapter implementations) are allowed |

**Layer (b) — graph / resolver-dependent rules** proven with **dependency-cruiser** against throwaway temp-dir fixtures (never the repo tree, so tsc/build/lint never see them), plus a real-graph assertion that the whole `packages` + `apps/web/src` graph is clean (`architecture.test.ts`):

| Rule | Planted violation → flagged | Real graph |
|---|---|---|
| ① no circular dependencies | `a → b → a` fixture → `no-circular` | ✅ clean |
| ③ no cross-context internals | `modules/members → modules/billing/internal` → `no-cross-context`; importing `…/billing/index` is **allowed** | ✅ clean (no `modules/` yet) |
| ④ no `@pulse/ui` → `@pulse/db` | `packages/ui → packages/db` fixture → `ui-not-to-db` | ✅ clean |

> **Honest scope (per the spec, this is correct and sufficient now).** Rule ③ (cross-context) and the platform-adapter rule have **no production code to scan yet** — there are no bounded contexts, no `modules/`, and `@pulse/domain` is empty; the domain layer lands with the first Sprint-1 feature. For these two, the **planted-violation fixture is the only available evidence today** — the rule is wired and proven to fire, but no production code currently exercises it. (Same honesty pass applied to the inline-403 branch in Session 4 §8.9.) All other rules are exercised against real code (the clean-graph assertion + the live `lib/auth`/`lib/platform` allow-cases).

---

## 3. Platform-adapter rule scope (T-26 enforcement)

The new ban is scoped to `**/modules/**` (feature/domain slices) — **not** app-wide — because the adapter implementations (`lib/platform/clock.ts`, `id-generator.ts`) and cross-cutting infra legitimately call `Date.now()`/`randomUUID()`. Today `modules/` does not exist → **zero matches → lint stays green**; the rule is ready for the first feature and proven by the planted test. `no-restricted-syntax` options *replace* (never merge), so the `modules/**` override re-includes the role-name + hardcoded-permission guards — dropping them would have silently re-opened those holes inside feature code.

---

## 4. Test Summary

| Suite | Session 4 | Session 5 | Result |
|---|---|---|---|
| Unit + architectural fitness (`turbo run test`) | 39 | **56** | ✅ (+17: lint-rules ×13, architecture +4) |
| Integration (isolated test DB) | 7 | **7** | ✅ unchanged |
| E2E (Playwright + axe) | 15 | **15** | ✅ unchanged |
| **Total** | 61 | **78** | ✅ |
| `pnpm verify` (build/lint/type-check/format) | ✅ | ✅ | green |

---

## 5. Closing-HEAD Platform Baseline (record only — supersedes the Exit-Checklist snapshot)

Single run at HEAD `c6e9c45`, same environment as the Exit Checklist (i7-13650HX / Node 20.20.0). Comparison-only; not a gate.

| Metric | Value | Δ vs Exit Checklist (`8ec6cc2`) |
|---|---|---|
| Build (cold, `turbo run build --force`) | **26.07 s** | ~+5 s (run-to-run variance) |
| Verify (`pnpm verify`) | green | — |
| Unit + fitness execution | **7.83 s** / 56 tests | +17 tests, ~flat time |
| Integration / E2E | 7 / 15 tests | unchanged |
| Dev startup | ≈ 2 s (unchanged) | — |

---

## 6. Limitations & deferrals (honest boundaries)

1. **CI never executed.** No git remote exists (D-6); the workflow is authored + inspection-validated (YAML parses; env contract matches the integration/seed loaders; `pnpm/action-setup` reads the pinned `packageManager`). First real run is deferred to remote setup — at which point branch protection must require the `gate` + `database` jobs.
2. **③ cross-context & platform-adapter rule have no live code yet** (§2) — planted-fixture-proven only, by design.
3. **E2E uses `next dev` single-worker** in CI as locally (the cold-compile race); a production-build E2E could re-enable parallelism — an optional future tweak, not Sprint-0 scope.
4. **Two accepted post-Sprint-0 follow-ups remain** (not Session-5 scope): evaluate Argon2id before production; re-run automated `/security-review` once a remote exists (`session-3-verification-report.md §8`).

---

## 7. Readiness for Sprint 0 closure

**READY.** All three Session 5 tasks are delivered and verified; the Exit Checklist §3 gap list is fully closed; `pnpm verify` is green and the 78-test suite passes; the auth/authz perimeter is unchanged. The three previously-🟡 dimensions (Testing CI gate, Architectural Fitness Tests, Development Workflow) are now ✅. Sprint 0's sprint-level Definition of Success (spec §8) holds end-to-end.

> Next: the **Sprint 0 Completion Report** records the formal close; the final release tag `v1.0.0-sprint-0` is created **only after** closure. **No Sprint 1 planning until Sprint 0 is formally closed.**
