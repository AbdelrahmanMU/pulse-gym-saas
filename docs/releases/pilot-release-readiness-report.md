# PULSE — Pilot Release Readiness Report

**Companion to** `pilot-release-checklist.md` (the release authority). **Branch:** `feat/platform-foundation` → `main`. **Scope:** one supervised two-week pilot gym (Egypt/EGP), behind platform-terminated HTTPS. **Not** a public/multi-gym production launch.

---

## Verdict

# ✅ READY — CONDITIONAL GO for a single supervised pilot

Merge `feat/platform-foundation` → `main` and deploy for a supervised two-week pilot **once the human accepts §16 of the checklist and the deploy-time [you] gates in §2/§5 are satisfied against real infra** (HTTPS, managed Postgres + PITR, migrate-as-release-step, EGP/timezone at onboarding).

This is **not** a GO for unsupervised, internet-facing, or multi-gym production — that requires clearing the pre-production hard gate (checklist §13). The pilot wall is deliberate and unchanged from the prior accepted RC review.

---

## Evidence (verified THIS session, on HEAD including the hardening change)

| Gate | Result |
|---|---|
| TypeScript (`type-check`) | ✅ pass |
| ESLint (`lint`) | ✅ pass |
| Architecture fitness (6 rules + adapter) | ✅ pass (in unit run) |
| Production build (`pnpm build`) | ✅ pass |
| Unit + fitness | ✅ **214** tests, **30** files (added `auth.config.test.ts`) |
| Integration (real Postgres) | ✅ **116** tests, 9 files |
| E2E + axe + RTL (Playwright) | ✅ **42** tests (incl. `auth.spec.ts` gate, `lifecycle.spec.ts` prod-build mutation guard, `adaptive.spec.ts` mobile axe at 375/1280 + dark) |
| Docker image (Linux) | ✅ builds; boots Next 16.2.10; `/api/health` → 200 `{status:ok,database:ok}`; `/sign-in` → 200 `lang="ar" dir="rtl"`; `/dashboard` unauth → renders only the brand shell (visible text = "PULSE"), no protected data, RSC-redirects to `/sign-in` |

**Why fresh evidence mattered:** the perf-recovery commit (`088e648`, Next 16 + deterministic mutations + router cache) and the prior Docker boot-verification (`5e19ab6`) predated each other; memory's "gate green" was stale w.r.t. HEAD. Both the DB-backed gate and the Docker boot were **re-run this session on the current tree** (including the maxAge change), so the verdict rests on current evidence, not inherited claims.

**One behavioral nuance (documented, not a defect):** under Next 16, an unauthenticated `/dashboard` returns **HTTP 200 with an RSC soft-redirect** to `/sign-in` (the older runbook noted a hard 307). Verified no protected data is disclosed (visible body = "PULSE"; flight payload carries the `/sign-in` redirect; `auth.spec.ts` confirms the browser lands on `/sign-in`). A middleware-level hard redirect for non-JS clients is a defense-in-depth item folded into the pre-prod gate (checklist §13).

---

## What was implemented (the entire release-hardening slice)

Exactly one code change met the P0 bar (production-impacting + low-risk + low-change + high-confidence + pilot-critical) — and only after a human decision on a genuine two-authority conflict (prior review's "fix-before-RC" vs this sprint's "do not reopen auth"), per constitution §13:

- **TD-10a** — `session.maxAge = 12h` in `apps/web/src/lib/auth/auth.config.ts` + regression test `auth.config.test.ts`. Bounds a suspended/removed staff member's live session from ~30 days to a working day. Note this is an **absolute 12h cap, not an idle timeout** (`updateAge` is left at its 24h default, which exceeds `maxAge`, so the token never refreshes) — every user re-authenticates ~twice a day regardless of activity, by design. The complementary per-request account-status re-check is deferred to the pre-prod gate.

Everything else surfaced by the audit was **documented, not implemented**, per the conservative mandate:
security headers/CSP, `/api/version` endpoint, request-context correlationId wiring, a shared `ActionResult`/`mapError` refactor, and all After-Beta/Pre-prod debt.

Deliverables: `docs/releases/pilot-release-checklist.md` (authority) + this report + the two code files above.

---

## Release Risk Assessment (ranked)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **1** | **Deploy over plain HTTP** → `__Secure-` cookies rejected → sign-in silently fails | Med (first-deploy footgun) | High (pilot can't start) | HTTPS is a hard §2/§5 gate; every recommended platform terminates TLS; smoke test §9 catches it immediately. |
| **2** | **No DB backups/PITR before first real data** → money/membership loss unrecoverable | Low–Med | High (sacred data) | §2/§4 make PITR a hard pre-cutover gate; forward-only additive migrations lower schema risk. |
| **3** | **Suspended staff retains live session** up to 12h | Low (supervised, small team) | Med | `maxAge` cut from 30d→12h this sprint; instant revoke = rotate `AUTH_SECRET` (§11). Full re-check = pre-prod. |
| **4** | **Wrong currency/timezone** (seed defaults USD/UTC) → money renders "USD" | Med (if onboarding skipped) | Low–Med (cosmetic, not wrong math) | Onboarding sets EGP/Africa-Cairo; smoke test §9 verifies; money math is currency-agnostic integer/Decimal. |
| **5** | **Thin live-DB tests on some command allow-paths** (TD-6) → latent regression | Low | Med | Core money invariants + tenant isolation integration-tested (116 green); supervised pilot observes. |
| **6** | **Notifications depend on opening the dashboard** (no cron, TD-8) → stale alerts if unopened | Med | Low | Owner opens dashboard daily in a pilot; cron is post-pilot roadmap. |
| **7** | **No security headers / rate-limiting / password policy** | Low (supervised, single tenant, TLS) | Med at public scale | Explicitly pre-prod gate (§13); acceptable for a supervised pilot, blocker for public launch. |
| **8** | **Observability thin** — logs lack correlationId (request-context ALS unpopulated) | Med | Low | pino JSON + `error.digest`→server log line is enough for a supervised pilot; wiring is pre-prod. |

No risk bypasses the mutation pipeline or tenant isolation; none is a correctness or money-math defect.

---

## Release Decision — "Would I, as CTO, approve this merge for a real two-week customer pilot?"

**Yes — for a single supervised pilot, conditional on the deploy-time infra gates.**

Justification, on evidence:
- The full quality gate is **green on HEAD this session** (214 unit/fitness, 116 integration, 42 e2e+axe+RTL), and the production **Docker image builds, boots, health-checks, and auth-gates** correctly — not inherited from memory.
- Tenant isolation and money invariants (the two sacred properties) are P0-tested and green; authorization is permission-based and fitness-enforced.
- Of the prior accepted review's **four** "fix-before-RC" gate items, three are cleared: TD-7 (module a11y) and TD-15 (payments placeholder) were closed by the v1.2 Adaptive slice, and TD-10a is **materially reduced** (30d→12h) with human sign-off plus a documented emergency lever (`AUTH_SECRET` rotation).
- The **fourth, TD-6** (thin live-DB tests on some command allow-paths), is **consciously carried, not fixed** — accepted because the two sacred properties (money invariants + tenant isolation) *are* integration-tested and green, and the pilot is supervised. This is a deliberate, human-visible deviation from the prior gate, not an oversight.
- Every remaining known limitation is either cosmetic, an owner-operable operational note, or explicitly scoped to the pre-production gate that this pilot does not cross.

Why **conditional, not unconditional**: three gates are only satisfiable against real infrastructure and are the human's to execute — HTTPS/TLS, managed Postgres with PITR, and the migrate-as-release-step — plus EGP/timezone at onboarding. The code is ready; the deployment must honor the runbook.

Why **not** a blanket production GO: the pre-production hard gate (auth rate-limiting, password policy, security headers, full session re-check, KDF evaluation, automated security review, observability wiring) is deliberately deferred. Do not point this pilot deployment at the open internet or a second tenant until §13 is cleared.

---

## Merge Instructions (run only after human acceptance of checklist §16)

```bash
# From a clean tree on the feature branch
git checkout feat/platform-foundation
git pull --ff-only                      # if a remote exists
# (the release-hardening slice is already committed on this branch)

git checkout main
git pull --ff-only                      # if a remote exists
git merge --no-ff feat/platform-foundation -m "release: MVP pilot"
# Tag the release
git tag -a v0.1.0-pilot -m "MVP Pilot Release"
git push origin main --tags             # once a remote is configured
```

> Per project git-workflow, the human owns the merge. If squash-merge is preferred over `--no-ff`, use the platform's squash-merge on the PR instead. A git remote does not yet exist — configure `origin` first for the `push`/branch-protection steps; the dormant `ci.yml` (`gate` + `database` jobs) should be made merge-required at that time.

## Deployment Instructions (Render — exact sequence)

Authority: `docs/deployment/deployment-runbook.md` (§2). Render specifics:

1. **Managed Postgres** — create a Render PostgreSQL (v14+) in **Frankfurt**. Enable daily backups + PITR. Copy the **Internal Database URL**; append `?sslmode=require` if not present.
2. **Web Service** — New → Web Service → connect the repo → **Environment: Docker** (uses the committed `Dockerfile`). Region **Frankfurt** (same as DB).
3. **Environment variables** (Render dashboard → Environment):
   - `DATABASE_URL` = the managed Postgres URL (with `sslmode=require`)
   - `AUTH_SECRET` = output of `openssl rand -base64 32`
   - `NODE_ENV` = `production`
4. **Migrate (release step, not the runtime image)** — set Render's **Pre-Deploy Command** OR run once from a full-workspace context (CI/your machine pointed at the prod DB):
   ```bash
   pnpm install --frozen-lockfile && pnpm build
   DATABASE_URL=<prod-url> pnpm --filter @pulse/db db:deploy
   ```
5. **Seed once** (idempotent — creates RBAC + bootstrap owner + `PULSE HQ`):
   ```bash
   DATABASE_URL=<prod-url> OWNER_INITIAL_PASSWORD=<strong-pass> node packages/db/dist/seed.js
   ```
6. **Deploy** the web service. Render builds the image and runs `node apps/web/server.js` on `$PORT` behind its automatic **HTTPS**.
7. **Health check** — point Render's health check path at **`/api/health`** (expects 200).
8. **Smoke test** (checklist §9 / runbook §6): sign in as the owner over HTTPS → confirm session persists → complete onboarding setting **EGP + Africa/Cairo** → change the owner password → create a member → sell a membership → record a payment → confirm dashboard/reports update.

If all smoke-test steps pass, the pilot is live.

---

## Stop condition

The release-hardening slice is committed on `feat/platform-foundation`. **No merge to `main` has been performed** — that awaits human approval per the sprint mandate and checklist §16.
