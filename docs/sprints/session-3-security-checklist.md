# Session 3 — Security Checklist

### Final review gate before the Authentication & Authorization layer

| | |
|---|---|
| **Status** | ✅ **APPROVED — gate PASSED (2026-06-26). Session 3 implementation may begin.** |
| **Why** | Session 3 is the first security-sensitive session (spec R6). One auth/authz mistake is a breach, not a bug (constitution §1). |
| **Scope** | A pre-flight contract — *not* a re-statement of governance. Each item cites its canonical home; that doc wins on detail. |
| **Canonical sources** | `authorization-architecture.md` · `security-guidelines.md` · ADR (mutation pipeline + tenancy) · `error-handling.md` · CLAUDE.md §8/§9 · spec T-19/T-20/T-26/T-27 |

> Use this as: (a) a pre-flight read before writing any Session 3 code, (b) the invariants the code must satisfy, (c) the exit gate before merge. Tick every box honestly; an unchecked box blocks merge.

> ### ✅ Approval & gate record (2026-06-26)
> **This checklist is reviewed and APPROVED; the security gate is PASSED — Session 3 (T-07, T-19, T-20, T-26) implementation is authorized to begin.**
>
> **What "PASSED" means here:** *approved to begin*, **not** "every box ticked." Most boxes in §1–§7 describe code that does not exist yet (e.g. "zero `next-auth` imports outside the adapter", "P1 tests pass", "`/security-review` run and passed"). Those are **exit criteria**, validated and ticked in the end-of-session **Verification Report** — never at approval time. Ticking them now would be exactly the dishonest reporting the constitution forbids (§9). They remain unchecked until empirically satisfied.
>
> **Carry-in is the first implementation step, not a blocker.** The three "Known carry-in from Session 2" items (real Owner hash; `@pulse/auth` permission-key constants; `AuthenticationAdapter` interface in `@pulse/types` + scoped `next-auth` lint exception) are addressed **early in Session 3 (T-19/T-20)**, per the design note below.
>
> **Approved implementation decisions (verdicts the Verification Report must re-confirm and the human may veto at acceptance):**
> 1. **Session strategy = JWT** (Auth.js Credentials supports only JWT; the frozen schema has no `Session`/`Account` tables, so this avoids a forbidden migration). Resolved permission-key set is embedded in the **server-signed** JWT ("cached per session", DDS §6) — *staleness limitation:* a role re-mapping/revocation is not reflected until re-login (documented as a Known Limitation).
> 2. **Password hashing = Node `crypto.scrypt`** (async; N=2¹⁵, r=8, p=1; ≥16-byte salt; ≥32-byte key; params+salt encoded in the stored hash; `timingSafeEqual` verify). This is a **platform primitive, not custom crypto and not a new dependency** — it satisfies the "strong adaptive algorithm" intent of `security-guidelines.md`, which *names* bcrypt/argon2. **Flagged for human veto**: choosing bcrypt/argon2 instead would be a new, human-owned dependency.
> 3. **Permission home split:** `@pulse/auth` keeps a **DB-free pure surface** (key constants + `hasPermission`) reusable for UI control-hiding, plus a **server subpath** for derivation; the `GymUser→Role→RolePermission` read happens in `apps/web` and the *derivation* is centralized in `@pulse/auth` — **no `@pulse/auth ↔ @pulse/db` cycle**.
> 4. **Owner real hash** is set idempotently in the seed **only while the stored value is still the Session-2 sentinel**, from a **seed-scoped** `OWNER_INITIAL_PASSWORD` (documented dev default; **not** added to the app's required env schema).
> 5. **Branch context (MVP)** = the gym's single deterministic default branch (oldest active); valid credentials with **no active `GymUser`** are rejected (no tenant context).
> 6. **Tenant-isolation (§6) target:** Session 3 has no business resource to isolate, so an `assertSameGym → 404` tenancy helper is implemented and unit-tested now; **resource-level** cross-tenant isolation is exercised when the first feature lands (stated honestly in the report, not overclaimed).
>
> Recorded in `session-progress.md` (Session 3 row). Authority for this approval: the human's Session-3 directive (review → approve → record → mark PASSED → implement → end with a Verification Report → STOP before Session 4).

---

## 1. Authentication — behind a replaceable adapter (T-19)

- [x] Auth.js (Credentials) is wired **only behind the `AuthenticationAdapter`** interface in `@pulse/types`; app/domain code depends on the **interface + domain-shaped principal**, never on Auth.js types.
- [x] **Zero `next-auth` imports outside the adapter implementation** — enforced by the T-27 lint rule (`no-restricted-imports` for `next-auth` **and `next-auth/*`** subpaths; the prior bare-specifier ban missed subpaths — fixed and proven by a planted violation); `lib/auth/**` is the single scoped exception.
- [x] **No custom crypto.** Hashing uses Node `crypto.scrypt` (a platform primitive — not a hand-rolled scheme, no plaintext compare). *Human-vetoable vs bcrypt/argon2 (a new dependency) — see report §2.*
- [x] The seeded Owner's placeholder `passwordHash` is **replaced with a real scrypt hash** (idempotently, only while still the sentinel); login exercised in the E2E.
- [x] The session carries the **active gym/branch context**; the `(app)` layout enforces an authenticated, gym-scoped session (E2E: unauth → redirect).
- [x] Login behaviors: valid creds → session established (E2E); **invalid creds → rejected, generic message** (no enumeration hints; integration + E2E); **unauthenticated access → redirect to sign-in** (E2E).
- [x] `AUTH_SECRET` comes from the validated env module only; never committed, never logged, never in the client bundle (server-signed JWT).
- [x] `auth.login` emits an audit/info log via the structured logger — **ids, never credentials/bodies**.

## 2. Authorization — permission-based, never role-based (T-20)

- [x] Every protected action checks a **permission** (e.g. `dashboard.view`), resolved from the session — **never** a role name.
- [x] **Zero** `requireRole(...)`, `role === …`, `switch(role)`, or any role-name branch — grep + ESLint guard find zero.
- [x] `@pulse/auth` is the **sole** authorization home (keys + catalog + check + derivation); no app/other package re-implements permission logic.
- [x] Permission **keys are referenced from `@pulse/auth` constants**, never raw literals — guard active everywhere except the key-definition file (caught a real test violation).
- [x] **Deny-by-default**: absence of a permission is a denial; the server re-checks every request (`/api/protected` → 401/403; `requirePermission` in RSC).
- [x] Permission **keys are immutable** (INV-7) — constants are append-only; none renamed/removed.
- [x] Dormant roles remain **unassignable** (`is_assignable=false`); only Owner/Trainer assignable (catalog-consistency test).
- [x] The placeholder route demonstrates allow/deny **by permission**; **denied → 403** (`/api/protected`), **cross-tenant → 404** (`assertSameGym`, unit-tested).
- [x] Tests assert on **permissions, not roles**, so role re-mappings never break tests.

## 3. Mutation pipeline & tenancy (ADR — canonical)

- [x] Pipeline building blocks exist and are composable: **authenticate** (`currentUser`/`requireSession`) → **authorize by permission** (`authorize`/`requirePermission`) → **validate Zod** (sign-in boundary) → **scope `gymId` from session** → execute → revalidate. *No business mutation exists yet; the first feature slice exercises the full ordered pipeline.*
- [x] **Never trust scope/role/permission/`gymId` from client input** — `gymId`/permissions come from the server-signed session, never from request input.
- [~] Every business query **filtered by `gymId`** — *no business query exists yet; the `assertSameGym` scope guard is the mechanism every feature query will use (INV-2).*
- [x] Cross-tenant access surfaces as **404, never 403** — `assertSameGym` → `NotFoundError` (404), unit-tested.

## 4. Platform adapters — boundaries, not repositories (T-26)

- [x] `IClock`, `IIdGenerator`, `ICurrentUser` defined in `@pulse/types`; concrete impls in `apps/web`. **Exactly these three** — `IFileStorage` absent (deferred).
- [x] App code depends on the **interfaces**; no raw `Date.now()`/`crypto.randomUUID()`/Auth.js in domain code (the lib platform impls are the only call sites; `next-auth` confined to `lib/auth/**`). *Full dependency-cruiser fitness assertion for this lands with the T-27 consolidation in Session 5.*
- [x] Adapters return **domain-shaped values** (`AuthenticatedPrincipal`, `Date`, `string`), not framework types.

## 5. Secrets, logging & error surface

- [x] No secret/PII in logs — **ids, not bodies**; `redact` covers `passwordHash`/`AUTH_SECRET`/tokens; no new secret-bearing field is logged (auth logs ids only).
- [x] No server secret crosses to the client; no new `NEXT_PUBLIC_` value; the permission set rides a server-signed JWT.
- [x] Typed taxonomy maps to **safe** messages/codes; the protected route returns only a stable code (no stack/SQL/internal id); **no empty `catch {}`**; unexpected errors propagate. *The full React error-boundary + Catalog `ErrorState` mapping + correlation id is T-17 (Session 4).*

## 6. Tests required to land (P1 — gate "done")

- [x] **Authentication**: unauthenticated access redirected (E2E); invalid creds rejected (integration + E2E).
- [x] **Authorization**: permission **present → allowed**, **absent → denied (403)** (`authorize` unit test); dormant role unassignable (catalog test).
- [~] **Tenant isolation**: cross-tenant → 404 is **unit-tested at the mechanism level** (`assertSameGym`). *Resource-level "Gym A cannot read/write Gym B" is exercised when the first business resource exists (no business table is written this session) — stated, not overclaimed.*
- [x] **Adapters**: injectable fakes (deterministic clock/id) used in tests.
- [x] All assertions are **permission-/behavior-based**, not role-name-based.

## 7. Mandatory review gate (R6)

- [x] T-27 fitness checks pass for the new code at the active layer (no Auth.js outside adapter — lint, planted-violation proven; no role checks; no hardcoded permission strings; no `ui→db`; no cycles). *Full CI-wired six-rule suite = Session 5.*
- [x] `advisor` consulted on the non-trivial security design (adapter seam, session shape, gate helper) **before** finalizing — twice (design + pre-report), and its blocking findings were acted on.
- [~] **`/security-review`**: the automated skill **could not run** (no git remote — it aborts on `origin/HEAD`). A **manual** security review was performed instead (findings in the report §2; no critical/high in the implemented code). **Not ticked as "passed"** — re-run the skill once a remote exists. Re-review on any security-perimeter revert/re-land; rotate `AUTH_SECRET` if ever exposed.
- [x] Definition of Done met (CLAUDE.md §10) + exit boxes resolved → **human ACCEPTED Session 3 (2026-06-29)**; committed + tagged `v0.3.0-iam-foundation`. *(Two accepted follow-ups carried forward — report §8: evaluate Argon2id pre-production; re-run automated `/security-review` after a remote exists.)*

---

### Known carry-in from Session 2 (address early in Session 3)

- Owner `passwordHash` is a **placeholder** — set a real hash via the chosen Auth.js hashing path (item §1).
- `@pulse/auth` permission-key **constants do not exist yet** — create them in T-20 so the hardcoded-permission-string guard has a target to reference (item §2).
- The Authentication-Adapter interface is **not yet authored** — it lands in `@pulse/types` in T-19 (item §1); the `next-auth` lint ban is already configured and will then scope its single exception.

> **Approval:** when the human approves this checklist, Session 3 implementation begins. From here the focus is **code quality + security behavior**, not project infrastructure.
