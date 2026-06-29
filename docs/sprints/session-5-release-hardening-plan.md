# Session 5 — Release Hardening Plan

### PULSE Gym SaaS · The closing session of Sprint 0 (T-24 · T-25 · T-27)

| | |
|---|---|
| **Status** | 📋 **PLAN — awaiting human approval.** No implementation begins until this plan is accepted (per the directive and `development-workflow.md`). |
| **Theme** | Release hardening: pre-commit hooks, CI completion, architecture gates, quality automation, final verification, **Sprint 0 closure**. |
| **Tasks** | **T-24** (git hooks, pre-commit only), **T-25** (CI configuration), **T-27** (architectural fitness tests — full six-rule suite + CI wiring). |
| **Authority** | `sprint-0-technical-specification.md` (T-24/T-25/T-27 task contracts; §7.1 Session 5 exit criteria; §8 sprint-level Definition of Success); decisions **D-4** (pre-commit only), **D-5** (axe CI/test-only), **D-6** (GitHub Actions, dormant-until-remote). |
| **Scope source** | The **Sprint 0 Exit Checklist §3 gap list**. Session 5 closes *exactly* that set — and nothing else. |
| **Hard boundary** | 🚫 **No new product features.** No bounded-context code (Members/Plans/Memberships/Payments/Dashboard/Notifications/Reporting). No new dependency/abstraction/pattern beyond those already approved in spec §4 (fitness-test deps: ESLint boundary plugin, dependency-cruiser/ts-morph — already approved with T-27). No edit to the frozen governance docs. No change to the **frozen auth/authz perimeter**. |

> **Why this is "hardening," not "building."** Sessions 1–4 delivered the platform; it builds, migrates, seeds, authenticates, authorizes, and renders the accessible shell (Exit Checklist §2). Session 5 adds **no capability a user sees** — it installs the *guard rails* that keep the verified platform from drifting over months of AI development: a fast local commit gate, a merge-blocking CI gate, and the automated architecture-conformance suite. This is the difference between "it works today" and "it cannot silently rot."

---

## 1. Objective & Definition of Success

**Objective.** Install the quality/automation gates that make the Sprint 0 platform *self-defending*, then run a final end-to-end verification and close Sprint 0.

**Definition of Success (session-level — all must hold):**
1. **T-24** — `pnpm install` provisions a Husky **pre-commit-only** hook running lint + format on **staged files** (fast); a staged violation is blocked locally; **no pre-push hook exists**.
2. **T-25** — A GitHub Actions workflow runs `pnpm install` + the Turbo gate (build/lint/type-check/test) + a Postgres service for integration tests + the authz/no-literal gates; **red blocks merge**; **authored-but-dormant** until a remote exists (D-6).
3. **T-27** — The architectural fitness suite enforces **all six rule classes + the platform-adapter rule**, each proven by a **planted-violation test**; the suite runs in CI and **red blocks merge**; it consolidates the role-name grep gate.
4. **Final verification** — `pnpm -w run verify` green; the full **61-test** suite (39 unit/fitness + 7 integration + 15 E2E) green at the closing HEAD; the auth/authz perimeter still **frozen/untouched**.
5. **Closure** — the **Sprint 0 Completion Report** is produced and `session-progress.md` records Session 5 closed; Sprint 0 is declared closed pending human acceptance.

---

## 2. Task plan

### T-24 · Git hooks (pre-commit only)
- **Deliverable.** Husky + lint-staged. A single **pre-commit** hook runs **lint + format on staged files only**. `prepare` script installs Husky on `pnpm install`. **No pre-push hook** (D-4 — heavier gates live in CI).
- **Design notes.** Keep it fast: staged-only, lint + format, nothing else (no type-check/test/a11y/fitness on commit). `--no-verify` discouraged in docs, not blocked. Conventional Commits already practiced (git log) — documented, not hook-enforced.
- **Acceptance (spec T-24).** Staged lint/format violation → blocked locally and fast; clean commit passes quickly; **no pre-push hook fires** on `git push`.
- **Verification.** Plant a staged lint error → commit blocked; confirm no pre-push hook on push; clean commit fast.
- **Risks.** Hooks slowing commits (→ staged-only, lint+format only); bypass culture (→ discourage `--no-verify`); local/CI gap (→ accepted; CI is the backstop, D-4/D-6).

### T-25 · CI configuration (GitHub Actions — dormant)
- **Deliverable.** A `.github/workflows/` pipeline that, on PR: checks out, sets up Node 20.20.0 + pnpm 9.15.4, `pnpm install` (frozen lockfile), runs the **Turbo gate** (build → lint → type-check → test) with caching, stands up a **Postgres 18 service** for the integration suite, and runs the **authz grep gate + no-design-literal check** (the latter now subsumed by the T-27 fitness suite + the existing token-compliance test). Branch protection requires green CI before squash-merge.
- **Design notes.** **Dormant-until-remote (D-6):** authored and inspectable, minimal, *not* overbuilt — no remote/host is chosen yet. axe-core runs **in CI/test only**, never on commit (D-5). CI secrets via the host secret store, never committed. E2E in CI may use a production build to re-enable Playwright parallelism (Exit Checklist §4 note) — optional, decided at wiring time.
- **Acceptance (spec T-25).** Once a remote exists: a PR with a planted violation → CI red, merge blocked; clean PR → green; Turbo caching speeds reruns. Until then: validated by inspection / `act`-style dry run.
- **Verification.** Inspect the workflow; dry-run where possible; on first remote push, prove red-blocks-merge with a planted violation.
- **Risks.** CI green-but-incomplete (→ include authz/literal/test gates + the full fitness suite); secrets in CI (→ host secret store). **Open item for the human:** no remote exists — the pipeline ships dormant; first real run is deferred to remote setup (tracked, not a Session-5 blocker per D-6).

### T-27 · Architectural fitness tests (full six-rule suite + CI wiring)
- **Deliverable — extend the existing subset to the full set.** Today `apps/web/fitness/architecture.test.ts` enforces 3 rules (no-circular, packages↛apps, ui↛db). Session 5 completes:
  - **(a) Lint layer** — `import/no-cycle`; an import-boundary plugin (e.g., `eslint-plugin-boundaries`) for layer/context direction; `no-restricted-imports` for `@pulse/ui`→`@pulse/db` and `next-auth`/Auth.js outside the Authentication Adapter.
  - **(b) Fitness suite (Vitest + dependency-cruiser/ts-morph)** — the rules ESLint can't express cleanly, asserting **all six classes + the adapter rule**:
    | # | Rule | Status today |
    |---|---|---|
    | ① | No circular dependencies | ✅ present (subset) |
    | ② | No direct role checks (`requireRole`/`role ===`/`switch(role)`) | 🔜 add as fitness assertion (consolidates the T-20/T-25 grep gate) |
    | ③ | No cross-context violations (no context imports another's internals) | 🔜 add |
    | ④ | No `@pulse/ui` → `@pulse/db` | ✅ present (subset) |
    | ⑤ | No hardcoded permission names (must reference `@pulse/auth` key constants) | 🔜 add as fitness assertion |
    | ⑥ | No Auth.js import outside the Authentication Adapter (D-8) | 🔜 add as fitness assertion |
    | + | **Platform-adapter rule** — no raw `Date.now()` / `crypto.randomUUID()` / Auth.js in domain (T-26 enforcement) | 🔜 add |
- **Acceptance (spec T-27).** A **planted violation of each** rule fails the corresponding check; a clean codebase passes; the suite runs in CI and **red blocks merge**; consolidates the role-name grep gate.
- **Verification.** Plant each violation → its check fails; remove → passes; confirm CI executes the suite and blocks on red.
- **Risks.** Incomplete rules → false confidence (→ a planted-violation test *per rule*); maintenance cost (→ few, declarative, high-value rules); Windows/flat-config `import/no-cycle` limitation (known — dependency-cruiser is the cross-platform cycle gate, Session 2 report §3.1).

---

## 3. Sequencing & dependencies

```
T-24 (hooks) ──┐
               ├─► T-27 (full fitness suite) ──► T-25 (CI wires hooks-parity + fitness + Turbo gate)
existing 3-rule┘                                        │
fitness subset                                          ▼
                                          Final verification ──► Sprint 0 Completion Report ──► CLOSE
```
- T-24 is independent and fast (land first). T-27 extends the existing suite (depends on ESLint T-21, Vitest T-23). T-25 wires T-27 + the Turbo gate merge-blocking, so it lands **after** T-27 is green locally. Final verification runs against the whole platform at the closing HEAD; the Completion Report follows.
- **No security-reviewed work** in Session 5 (the perimeter is frozen) — but any incidental touch of `lib/auth/**` or `@pulse/auth` is out of scope and must not happen.

---

## 4. Constraints carried from the constitution & spec
- **Permission-based authz only** — the new fitness rule ② must assert *zero* role-name branches; it does not introduce any.
- **No new unapproved deps** — only the T-27 fitness deps already approved in spec §4 (ESLint boundary plugin, dependency-cruiser/ts-morph). Anything else → STOP and ask.
- **Frozen governance docs untouched**; **frozen auth/authz perimeter untouched**.
- **Docs updated in the same change set**; each task's DoD includes its doc update.
- **Tokens-only / Catalog-only** — N/A (no UI in Session 5).

---

## 5. Out of scope (explicit)
- ❌ Any product/bounded-context feature (the sprint's hard line).
- ❌ A pre-push hook (D-4).
- ❌ Running CI against a live remote (none exists — pipeline ships dormant, D-6; first run deferred to remote setup).
- ❌ The two accepted post-Sprint-0 follow-ups: Argon2id evaluation; automated `/security-review` once a remote exists (`session-3-verification-report.md §8`) — tracked for after closure, not Session 5.
- ❌ Editing frozen governance docs (the recommended `implementation-strategy.md` pointer + adapter entries in `decision-log.md`/ADR remain the human's call — Exit Checklist §2.14).

---

## 6. Exit criteria (what "Session 5 done" means)
1. T-24, T-25, T-27 acceptance criteria all hold (§2), each proven (planted-violation tests for the six+1 fitness rules; staged-violation block for the hook; workflow inspected/dry-run for CI).
2. `pnpm -w run verify` green; full **61-test** suite green at the closing HEAD; auth/authz perimeter unchanged.
3. A **Session 5 verification report** records criterion-by-criterion evidence (same rigor as Sessions 2–4).
4. The **Sprint 0 Completion Report** is produced (the next deliverable after Session 5), and `session-progress.md` marks Session 5 ✅ and Sprint 0 closed pending human acceptance.

> **Definition of Success met** ⇒ every Exit Checklist §3 gap is closed and the sprint-level Definition of Success (spec §8) holds end-to-end: hooks pre-commit-only; CI gate merge-blocking (dormant); fitness tests enforce all six rules; red blocks merge.

---

## 7. After Session 5 (the directive's tail — recorded, not started)
1. **Sprint 0 Completion Report** — the close-out artifact: confirms §8 Definition of Success met, links every session report + this plan + the Exit Checklist, records the final baseline, lists carried follow-ups, and gives the honest closure verdict.
2. **Then — and only then — Sprint 1 planning may begin.** No Sprint 1 work is in scope here.

> **STOP.** This is a plan. Implementation of T-24/T-25/T-27 begins only on explicit human approval of this plan.
