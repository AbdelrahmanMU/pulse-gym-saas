# PULSE — Pilot Release Checklist

> **This document is the official release authority for the MVP Pilot Release.**
> It governs merging `feat/platform-foundation` → `main` and deploying a **single, supervised, two-week pilot** with a real gym owner. It does not restate procedures that live elsewhere — it **cites** them (deployment steps: `docs/deployment/deployment-runbook.md`; debt register: `docs/releases/v1.0-rc-review/technical-debt-report.md`). Where a checkbox needs a procedure, the runbook is the source of truth.

| | |
|---|---|
| **Release** | MVP Pilot — `pulse-gym-saas` `0.1.0` |
| **Branch** | `feat/platform-foundation` → merge to `main` |
| **Scope** | One supervised pilot gym (Egypt, EGP). **NOT** a public / internet-facing / multi-gym production launch. |
| **Prepared by** | Pilot Release Readiness Sprint (release-hardening slice only) |
| **Verdict** | See `pilot-release-readiness-report.md` (companion doc). Gate green this session; **CONDITIONAL GO** for a supervised pilot. |

---

## 1. Release Overview

PULSE is a multi-tenant gym-membership SaaS built as a modular monolith (Next.js 16 App Router, Prisma 7 + PostgreSQL, Auth.js v5 JWT). The MVP covers: gym onboarding, member management, membership plans, the derived-status membership lifecycle, payments & outstanding balances over an immutable ledger, an operations dashboard, in-app expiry notifications, operational reports, staff management, adaptive mobile UI, and full Arabic (RTL) + English localization.

**What this pilot is:** one gym, supervised by the owner, behind platform-terminated HTTPS, with the team watching. **What it is not:** a hardened public deployment — the pre-production security gate (§13) is deliberately deferred and **must** be cleared before any unsupervised or internet-facing launch.

**Release-hardening slice shipped with this checklist** (the only code changed in this sprint):
- **TD-10a** — bounded JWT `session.maxAge` to **12h** (`apps/web/src/lib/auth/auth.config.ts`), so a suspended/removed staff member loses their live session within a working day instead of ~30 days. Regression test added (`auth.config.test.ts`). The complementary per-request account-status re-check remains post-pilot (§13).

Everything else surfaced by the audit was **documented, not implemented** (§12–§13), per the conservative mandate.

---

## 2. Deployment Checklist

Procedure & rationale: **`docs/deployment/deployment-runbook.md`** (recommended path = long-running Node container + managed Postgres). This is the acceptance checklist over it.

- [ ] Managed **PostgreSQL 14+** provisioned in a low-latency region (Frankfurt / eu-central for Egypt/Gulf). PG18 **not** required (IDs are app-generated UUID-v7).
- [ ] **Automated daily backups + point-in-time recovery enabled** (hard requirement — money data is sacred).
- [ ] `DATABASE_URL` uses `?sslmode=require` (pooled endpoint if the host is serverless).
- [ ] Secrets set on the platform: `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`), `NODE_ENV=production`.
- [ ] **Migrations applied as a release/pre-deploy step** from a full-workspace context (never the runtime image): `pnpm --filter @pulse/db db:deploy`. A failed migration must block the release.
- [ ] **Seed run once** (idempotent) with the compiled seed + ambient env: `DATABASE_URL=<prod> OWNER_INITIAL_PASSWORD=<strong> node packages/db/dist/seed.js`. Do **not** use `pnpm db:seed` in prod (it hard-requires a `.env`).
- [ ] App image built from the committed `Dockerfile` and running `node apps/web/server.js` on `$PORT`.
- [ ] **HTTPS live** on the app domain with a valid certificate (see §5 — auth silently fails without TLS).
- [ ] Platform log drain pointed at container **stdout** (structured pino JSON).
- [ ] First-login smoke test passed (§9 / runbook §6).

---

## 3. Environment Variables

Contract enforced at boot by `apps/web/src/env.ts` (Zod fail-fast; the app refuses to start on a missing/malformed required var, and never echoes the offending value). Template: `.env.example`.

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ app + migrations | `sslmode=require`; pooled endpoint if serverless. |
| `AUTH_SECRET` | ✅ app | Strong **and stable** — rotating it signs everyone out (this is also the emergency revoke lever, §11). |
| `NODE_ENV=production` | ✅ | Enables `__Secure-` cookies (needs HTTPS) + `info` logging. |
| `OWNER_INITIAL_PASSWORD` | ⚠️ seed step only | Not read by the running app. Rotate after first login. |
| `OWNER_PHONE` | ⚠️ seed step only | Owner sign-in identifier (phone **or** email). Set once; re-runs never overwrite an edited phone. |
| `PULSE_LOCALE` | optional | `ar` (default) / `en`. Users pick in-app (cookie). |
| `LOG_LEVEL` | optional | `info` (prod default); `debug` to troubleshoot. |

- [ ] All required vars present; app boots (a boot failure prints exactly which var is invalid).
- [ ] No `NEXT_PUBLIC_*`, no `AUTH_URL` (omit — `trustHost:true` derives host), no OAuth keys needed.
- [ ] `.env` **never** committed (only `.env.example` is tracked — verified).

---

## 4. Database Checklist

- [ ] Two forward-only migrations apply cleanly: `20260626163926_init`, `20260630065547_add_gym_setup_completed_at`.
- [ ] Every business table carries `gym_id` (indexed) + `branch_id`; all queries scope by `gymId` (enforced by architecture-fitness suite + P0 tenant-isolation integration tests — **116 integration tests green this session**).
- [ ] Money stored as integer/Decimal (never float); plan values snapshotted on memberships/payments (immutable); people/financial records soft-deleted.
- [ ] Backups + PITR confirmed **before** first real member/payment is entered (§2).
- [ ] Currency set to **EGP** and time zone to **Africa/Cairo** in-app at onboarding (seed defaults are USD/UTC — see §9).

---

## 5. Authentication Checklist

- [ ] **HTTPS confirmed** — Auth.js v5 issues `__Secure-` session cookies under `NODE_ENV=production`; browsers reject them over plain HTTP, so **sign-in silently fails without TLS**. Not a code bug; `trustHost:true` is set.
- [ ] Owner can sign in with **phone or email** (Egyptian phone forms normalize to one canonical value; Arabic-Indic digits accepted).
- [ ] Owner password changed away from the bootstrap value after first login.
- [ ] JWT `session.maxAge` = **12h** (shipped this sprint) — a suspended staff member's live session expires within a working day.
- [ ] Understood: this is an **absolute 12h cap, not an idle timeout** — Auth.js `updateAge` (default 24h) is left unset, and since `maxAge` (12h) < `updateAge` (24h) the token never refreshes, so **every user re-authenticates ~twice a day regardless of activity**. This is intentional (an absolute bound on suspended-staff access); expect and pre-answer "why do I keep getting logged out" during the pilot.
- [ ] Understood: suspension blocks **new** sign-ins immediately; an **existing** session persists up to `maxAge` (12h). Emergency instant revoke = rotate `AUTH_SECRET` (signs everyone out) — see §11. Full per-request account-status re-check is post-pilot (§13).

---

## 6. Security Checklist

- [ ] Authorization is **permission-based** throughout (no role-name branching — enforced by fitness rule ②).
- [ ] Every guarded mutation follows authenticate → authorize (by permission) → validate (Zod) → scope (`gymId`) → execute → revalidate.
- [ ] Cross-tenant access surfaces as **404**, not 403 (no existence leak).
- [ ] Logs redact secrets (pino `redact`: passwords, tokens, `AUTH_SECRET`, `DATABASE_URL`, bodies); zero `console.*` in app source.
- [ ] Error UI shows calm copy + `error.digest` only — **no stack traces** to users; full context logged server-side via `instrumentation.ts`.
- [ ] `AUTH_SECRET` stored in the platform secret store, never committed.
- [ ] **Accepted for the supervised pilot / deferred to pre-prod (§13):** no HTTP security headers (CSP/HSTS/X-Frame-Options), no auth rate-limiting, no password-strength policy. Acceptable behind platform TLS with a supervised single tenant; **blockers for a public launch.**

---

## 7. Performance Checklist

- [ ] Next 16.2.10 + Client Router Cache `staleTimes.dynamic: 30s` (measured, matched set — do not change independently; re-run `e2e/lifecycle.spec.ts` against a production build after any change).
- [ ] Lifecycle/payment mutations use the deterministic full-navigation-on-success idiom (ADR-029) — verified by `e2e/lifecycle.spec.ts` against a production build (**42 e2e tests green this session**).
- [ ] Repeat navigation ~30ms (client cache); mutations ~450ms deterministic.
- [ ] Not load-tested (single-gym pilot volume). Deferred: same-route server-action perf hardening (LOW risk, do-not-reopen without production evidence — `docs/backlog/performance-hardening-same-route-actions.md`).

---

## 8. Localization Checklist

- [ ] Arabic (RTL) is the default; English available; users switch in-app (cookie-based `LanguageSwitcher`).
- [ ] 590/590 catalog parity, 100% coverage, RTL axe 0 violations (Sprint 2.x report).
- [ ] Known residuals (cosmetic, non-blocking — §12): three runtime-composed Tier-2 strings fall back to English; currency picker shows the ISO code; native date inputs show the UA `mm/dd/yyyy` placeholder.

---

## 9. Mobile Checklist

- [ ] v1.2 Adaptive mobile shipped: card lists, 16px inputs (no iOS zoom), CreationFAB + StickyMobileActionBar, safe-area tokens, filter bottom sheets, urgent-first dashboard, operational-first member/membership detail.
- [ ] axe clean at 375px + 1280px + dark mode (`e2e/adaptive.spec.ts`, inside the green e2e run).

---

## 10. Accessibility Checklist

- [ ] axe-core runs inside the Playwright e2e suite across module pages incl. staff, at 375/1280px + dark (TD-7 **closed**).
- [ ] Status conveyed via `*-text` tokens + icon + label (never color alone); focus = solid 2px ring + offset; reduced-motion honored.
- [ ] a11y gate green in the **42-test e2e run this session**.

---

## 11. Rollback Procedure

**App rollback (fast, safe):** redeploy the previous container image tag. The app is stateless; no rollback of app state needed.

**Database:** migrations are **forward-only** — never hand-edit or hand-revert a shipped migration.
- A *bad migration* is recovered by **restoring the PITR snapshot** taken before the release (this is why §2 makes PITR a hard gate), then redeploying the prior image. Do not attempt manual schema surgery.
- Because the two pilot migrations are additive (`init`, add nullable `setupCompletedAt`), a forward rollback risk is low, but PITR is the authority.

**Emergency access revoke (staff):** rotate `AUTH_SECRET` in the secret store and redeploy → **all** sessions invalidate immediately (everyone re-logs in). Use this if a suspended staff member must lose access before their 12h `maxAge` elapses.

**Full stop:** take the app offline at the platform (scale to zero / disable the service); data remains intact in managed Postgres.

- [ ] PITR snapshot confirmed **before** cutover.
- [ ] Previous image tag retained and redeployable.
- [ ] `AUTH_SECRET` rotation runbook understood as the instant-revoke lever.

---

## 12. Known Limitations (carried into the pilot — understood, not blocking)

Reconciled from `technical-debt-report.md` (authoritative), the risk report, and the polish report. None is a correctness or tenancy risk.

| ID | Limitation | Severity | Pilot mitigation |
|---|---|---|---|
| **TD-10a** | Existing JWT session survives up to `maxAge` after suspension (now **12h**, was 30d). | High → **reduced** | 12h bound shipped; `AUTH_SECRET` rotation = instant revoke (§11). |
| **TD-6** | Thin live-DB tests on some command allow-paths (payment record/void, report cmds). | High → partially closed | Core money invariants + tenant isolation are integration-tested (116 green); supervised pilot watches the rest. |
| **TD-2** | Count-vs-cached-list can momentarily drift on dashboard/reports. | Medium | Cosmetic; refresh reconciles. |
| **TD-8** | Notifications generate on page-open (no cron/scheduler). | Medium | Owner opens the dashboard daily in a pilot; acceptable. |
| **TD-3** | Notifications & Reports are Owner-only in MVP (Manager/Accountant dormant). | Medium | Pilot is owner-operated. |
| **TD-18** | A frozen membership never auto-resumes → a forgotten freeze over-extends the end date. | Medium (product) | Owner manages freezes manually; not a defect. |
| **TD-4** | `assignTrainer` not serialized (rare race → 500). | Low | Single operator; retry. |
| **TD-9** | Membership-level trainer/reason/notes not persisted (needs schema ADR). | Low | Out of MVP scope. |
| **TD-16** | No autofocus on first create-form field. | Low | Cosmetic. |
| — | No HTTP security headers; request-context correlationId not populated in logs; no `/api/version` endpoint. | Low/ops | See §13; acceptable for supervised pilot. |
| — | Native date placeholder `mm/dd/yyyy`; currency picker shows ISO code; 3 Tier-2 strings fall back to English. | Low (cosmetic) | Documented in polish report. |
| — | Seed demo currency is USD. | Operational | **Set EGP at onboarding** (§4/§9). |

---

## 13. Deferred Technical Debt & Pre-Production Hard Gate

**Deferred to post-pilot (After-Beta), not blocking:** TD-2, TD-3, TD-4, TD-8, TD-9, TD-12, TD-16, TD-18; same-route server-action perf hardening (do-not-reopen without production evidence).

**Pre-production hard gate — MUST clear before any unsupervised / internet-facing / multi-gym launch (NOT required for this supervised pilot):**
- [ ] **TD-10b** — auth rate-limiting + password-strength policy; revisit `AUTH_URL`/`trustHost`.
- [ ] **TD-10a (full)** — per-request account-status re-check in the JWT/session callback (complements the 12h `maxAge` shipped now).
- [ ] **TD-11** — Argon2id-vs-scrypt KDF evaluation.
- [ ] **TD-17** — automated `/security-review` (needs a git remote).
- [ ] **HTTP security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy via `next.config.ts` `headers()`.
- [ ] **Observability** — populate the request-context AsyncLocalStorage (`runWithRequestContext`) so logs carry correlationId/tenant scope.
- [ ] **`/api/version`** — build-info endpoint (git SHA via Docker build-arg) for deploy verification & support.

---

## 14. Post-Pilot Roadmap

1. Clear the pre-production hard gate (§13) before any wider launch.
2. Scheduled notification generation (cron) — remove the on-open dependency (TD-8).
3. Manager / Accountant permission enablement for Notifications & Reports (TD-3).
4. Standalone Payments feature (currently a placeholder decision) and reporting exports (PDF/Excel) — deferred by the architecture review (YAGNI until a real requirement).
5. Membership-level persisted fields (trainer/reason/notes) via a reviewed schema migration (TD-9).

---

## 15. Operational Support Notes

- **Build identification:** version is `0.1.0` in `package.json`; there is **no `/api/version`** endpoint yet (§13). For the pilot, identify the running build by the deployed **git commit / image tag** recorded at deploy time. Record it in your deploy log.
- **Health monitoring:** `GET /api/health` → `200 {"status":"ok","checks":{"database":"ok"}}` when healthy, `503 {"status":"degraded",...}` when the DB probe fails. Point the platform's uptime monitor here. No secrets in the payload.
- **Logs:** structured pino JSON on stdout. `error.digest` shown to a user maps to a server-side log line (searchable) — ask the owner for the digest string when they report an error.
- **Startup failures:** a bad env var aborts boot with a single, explicit message naming the offending variable (no secret values). A DB-unreachable app still boots but `/api/health` returns 503.
- **Instant staff revoke:** rotate `AUTH_SECRET` + redeploy (§11).
- **Currency/timezone:** if money renders as "USD", the gym wasn't set to EGP at onboarding — fix in gym settings.

---

## 16. Release Acceptance Checklist (sign-off gate)

- [ ] Full verification gate green at merge HEAD: type-check, lint, architecture fitness, production build, unit (214), integration (116), e2e + axe + RTL (42). *(Evidence: readiness report, this session.)*
- [x] Docker image builds on Linux + boots (Next 16.2.10) + serves `/sign-in` → 200 (`lang="ar" dir="rtl"`) + `/api/health` → 200 DB-ok + auth-gates `/dashboard` (renders only the brand shell, redirects to `/sign-in`, discloses no protected data). *(Confirmed this session on HEAD incl. the maxAge change — see readiness report §Evidence.)*
- [ ] §2 Deployment, §3 Env, §4 Database, §5 Auth, §11 Rollback checkboxes all satisfied against real infra.
- [ ] First-login smoke test (§9 / runbook §6) passes on the real HTTPS domain.
- [ ] Known limitations (§12) reviewed and accepted by the human owner.
- [ ] Human approves merge `feat/platform-foundation` → `main`.

> **Below this bar is not "done."** Merge and deploy only after the human accepts §16.
