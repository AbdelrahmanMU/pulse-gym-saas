# Sprint 1 · Epic 1 — Verification Report

### Gym Initialization (Gym Setup & Configuration) · PULSE Gym SaaS

| | |
|---|---|
| **Epic** | Sprint 1 · Epic 1 — the first business Epic, on the `v1.0.0-sprint-0` platform. |
| **Status** | ✅ **Implemented / Verified — awaiting human acceptance.** |
| **Verified on** | 2026-06-30 · branch `feat/platform-foundation` (not merged) · Node 20.20.0 · pnpm 9.15.4 · Next 15.5 · Postgres 18. |
| **Spec** | `sprint-1-epic-1-gym-initialization-spec.md` (approved) + the human's post-approval decisions (§1 below). |
| **Result** | `pnpm verify` green; **106 tests** (68 unit/fitness · 18 integration · 20 E2E). Auth/authz perimeter (`lib/auth/**`, `@pulse/auth` authorization surface) unchanged; the only `@pulse/auth` change is the **human-approved append-only** addition of `gym.view`. |

> Authoritative criteria: the approved Epic spec §10 (acceptance) + the applied decisions. Every claim maps to a reproduced result; implemented-but-unverified items are stated as such under §8.

---

## 1. Approved decisions applied (post-approval directives)

| Decision | Applied as |
|---|---|
| Treat as **Gym Setup & Configuration**, not creation; seeded Gym/Branch/Owner are **configured** | No `Gym`/`Branch` row is created; all flows update the seeded singletons. |
| **Owner Profile** = Self-Ownership Rule (`CurrentUser.Id == TargetUser.Id`), no new permission | `updateMyProfile` operates on `principal.userId` only — no target id accepted (un-trickable). |
| **Currency & timezone editable** in MVP | Editable on the gym form; ISO-4217 / IANA validated; no immutability guard (deferred). |
| Use **only `gym.view` + `gym.manage`** for gym configuration | `gym.view` **added** to `@pulse/auth` (append-only, INV-7); read = `gym.view`, write = `gym.manage`. `settings.*` not used for gym config. |
| End with a **complete onboarding experience** Login → Gym → Branch → Owner Profile → Success → Dashboard, with a **completion state** | Guided flow at `/onboarding/{gym,branch,profile,complete}`; the complete step renders the `SuccessState` ("Your gym is ready") → Dashboard. |
| (Implied) persist onboarding completion | New `gym.setupCompletedAt` (one additive, forward-only migration — human-approved over the spec's "no migration" since the completion state needs persistence). |

---

## 2. What shipped (file map)

**Authorization (human-approved, append-only):** `packages/auth/src/keys.ts` + `catalog.ts` — `GYM_VIEW = "gym.view"` under the existing `tenant_gym` capability; Owner inherits it via `ALL_PERMISSION_KEYS` (41 perms / 103 mappings now). Re-seeded (dev + test).

**Database (one additive migration, no destructive change):** `prisma/migrations/20260630065547_add_gym_setup_completed_at/` — `ALTER TABLE "gyms" ADD COLUMN "setup_completed_at" TIMESTAMPTZ;` plus `setupCompletedAt DateTime?` on the `Gym` model. *(The auto-proposed `DROP INDEX members_full_name_trgm_idx` — the raw-SQL trigram index Prisma doesn't model — was removed; the migration is purely additive. See §8.)*

**Catalog form components (Catalog §9/§10; first build of the form layer — deferred in Session 4):** `components/pulse/` — `form-field.tsx` (context-wired label/aria/error), `text-input.tsx`, `select-input.tsx` (native), `checkbox.tsx`, `form-layout.tsx` (FormLayout/FormSection/SubmitButton w/ `useFormStatus`), `alert.tsx`, `success-state.tsx`. No Radix (so the R-1 layering rule is untouched); tokens only.

**Gym module (`apps/web/src/modules/gym/` — the project's first `modules/**` slice):** `validation.ts` (Zod), `service.ts` (testable core: authorize→validate→scope→execute), `actions.ts` ("use server" wrappers), `queries.ts` (RSC reads + `needsOnboarding`), `options.ts` (ISO/IANA selects), `ui/{gym-settings,branch,profile}-form.tsx` + `ui/form-feedback.tsx`.

**Routes:** `(app)/settings/{gym,branch,profile}/page.tsx` (persistent settings, inline-403 pattern); `(app)/onboarding/{gym,branch,profile,complete}/page.tsx` (guided flow); `(app)/dashboard/page.tsx` (first-run redirect to onboarding); `(app)/layout.tsx` (real permission-gated Settings nav, replacing the Session-4 placeholder).

**Tests:** `modules/gym/validation.test.ts` (unit), `tests/integration/gym.test.ts` (P0), `e2e/gym-settings.spec.ts` + `e2e/onboarding.spec.ts` + `e2e/global-setup.ts`.

---

## 3. Acceptance Criteria (spec §10) — results

| Criterion | Result | Evidence |
|---|---|---|
| Functional US-1…US-4 | ✅ | Settings + onboarding forms persist gym/branch/profile; E2E drives the full onboarding flow to the dashboard. |
| Persistence + `updatedAt` | ✅ | Integration asserts DB reflects updates (gym name/currency/window, branch name, profile, `setupCompletedAt`). |
| **Authorization by permission** (allow + deny) | ✅ | Integration: `gym.view`/`gym.manage`/`branches.manage` allow for holder, **throw `AuthorizationError` for a principal without the key** — asserted on permissions, not roles. Fitness suite: zero role-name branches in the new module. |
| **Tenancy: cross-gym branch → 404** | ✅ | Integration creates a second gym+branch; `updateDefaultBranch` against the foreign branch throws `NotFoundError` (404, never 403). |
| **Self-ownership** | ✅ | `updateMyProfile` updates only `principal.userId`; a test with a different principal updates that user and leaves the owner untouched. |
| Validation (negative window, unknown currency/tz, blank name) | ✅ | Unit (Zod) + E2E (whitespace name → server "Gym name is required"). |
| **Accessibility (axe = 0)** | ✅ | E2E axe clean on `/settings/gym`, `/settings/branch`, `/settings/profile`, and `/onboarding/gym`. FormField label/aria wiring. |
| Responsive | ✅ (inherited) | Forms use single-column FormLayout in the responsive AppShell (Session-4 reflow verified); onboarding shares it. |
| No scope creep / no new component / no new key beyond `gym.view` | ✅ | No Members/Plans/etc.; form components are catalogued; only `gym.view` added (approved). |

---

## 4. Permissions (permission-based only)

| Action | Permission | Verified |
|---|---|---|
| View gym settings | `gym.view` | ✅ allow + deny (integration) |
| Update gym settings | `gym.manage` | ✅ allow + deny |
| View branch | `branches.read` | ✅ (gate present) |
| Update branch | `branches.manage` (+ `assertSameGym`→404) | ✅ allow + deny + 404 |
| View/update own profile | self-ownership (`principal.userId`) | ✅ scoped to self |
| Complete onboarding | `gym.manage` | ✅ allow + deny |

Settings nav items render **by permission** (`gym.view` / `branches.read`); My Profile always renders. No role-name branch anywhere (T-27 ② clean).

---

## 5. Test summary

| Suite | Epic-1 total | Δ | Notes |
|---|---|---|---|
| Unit + architectural fitness | **68** | +12 | gym validation schemas; fitness (incl. T-27 cross-context + platform-adapter) green against the new `modules/gym` slice. |
| Integration (isolated test DB) | **18** | +11 | P0: permission allow/deny, cross-gym 404, self-ownership, validation, onboarding completion (injected clock). |
| E2E (Playwright + axe) | **20** | +5 | settings a11y ×3 + gym save + server-validation; full onboarding flow Login→…→Success→Dashboard. |
| **Total** | **106** | **+45** | `pnpm verify` (build/lint/type-check/format) green. |

---

## 6. Architecture & pipeline compliance

- **Mutation pipeline** (ADR / constitution §8): every command runs authorize (by permission) → Zod validate → scope (`gymId`/`userId`) → execute → revalidate. The testable `service.ts` core takes an explicit principal (no ambient-session coupling) — which is what let the deny-path and tenancy tests be real (sidestepping the Session-4 §8.9 "Owner holds everything" limitation by constructing principals).
- **First `modules/**` slice** exercises the Session-5 T-27 rules against real code for the first time: no cross-context imports, **no raw `Date.now()`/`new Date()`/`randomUUID()`** (onboarding completion uses the injected `IClock`), no `next-auth` import — all fitness-green.
- **Tenancy:** `gymId` from the session on every gym/branch query; cross-gym → 404. `User` is global → profile scoped by `userId`, never `gymId`.
- **Design:** catalog components + tokens only (token-compliance scan green); the new form components live in `apps/web` (not `@pulse/ui`, per A1 — one app).

---

## 7. Onboarding flow

`needsOnboarding()` routes a setup-capable owner (`gym.manage`, `setupCompletedAt == null`) from the dashboard into `/onboarding/gym`. Steps reuse the same forms/actions with a `nextHref`; the terminal `/onboarding/complete` renders the `SuccessState` and its "Go to dashboard" button submits `finishOnboardingAction` → sets `setupCompletedAt` (via `IClock`) → redirects. Actors without `gym.manage` are never forced into onboarding.

---

## 8. Known limitations & honest scope (none block acceptance)

1. **Profile reflection in the shell = next sign-in (AC-4.2).** The shell renders identity from the Session-3 **JWT principal**; a profile DB write reflects after re-auth. A NextAuth `session.update()` was **not** wired (avoids touching the frozen auth perimeter for a name refresh). Stated in the form's success copy.
2. **Dev-DB migration artifact (dev-only, cosmetic).** `migrate dev` initially proposed dropping the raw-SQL trigram index; the migration was corrected to additive-only and the index was restored on the dev DB, but that DB's recorded migration checksum differs from the edited file. **Fresh DBs (CI / the isolated test DB) apply the corrected migration cleanly via `migrate deploy`** — verified (integration green). A `migrate reset` would re-pristine the dev DB at convenience.
3. **Toast deferred; inline `Alert` used** as the form-result surface (catalog-valid; the floating Toast system is on-demand). **Searchable Select** deferred — native `SelectInput` used (currency/timezone).
4. **Currency/timezone immutability guard** (once financial records exist) is **deferred** to a later Epic (OQ-3) — freely editable now (no plans/memberships/payments yet).
5. **E2E onboarding mutates `setupCompletedAt`** — handled by a Playwright `global-setup` (marks the e2e gym configured) + the onboarding spec's `before/afterAll` (opts into first-run, restores after). One run showed the **known Session-4 dark-mode-axe single-worker flake**; it passed on re-run (20/20).
6. **`authorization-architecture.md` §4/§6** still lists the pre-`gym.view` matrix — a governance-doc reconciliation flagged (the human's call, like the carried DDS §16 item); the code catalog (`@pulse/auth`) is the materialized source of truth and is updated.

---

## 9. Verdict

**Epic 1 is implemented and verified.** All acceptance criteria pass; P0 tenancy + authorization-by-permission + self-ownership are proven; the guided onboarding experience ends in a completion state before the dashboard; `pnpm verify` and the 106-test suite are green; the auth/authz perimeter is intact (only the approved `gym.view` key added).

> **STOP.** Per the directive, work halts here for human acceptance. **Epic 2 is not begun.**
