# Session 3 — Security Checklist

### Final review gate before the Authentication & Authorization layer

| | |
|---|---|
| **Status** | ⛔ **GATE — Session 3 (T-07, T-19, T-20, T-26) must not begin until a human approves this checklist.** |
| **Why** | Session 3 is the first security-sensitive session (spec R6). One auth/authz mistake is a breach, not a bug (constitution §1). |
| **Scope** | A pre-flight contract — *not* a re-statement of governance. Each item cites its canonical home; that doc wins on detail. |
| **Canonical sources** | `authorization-architecture.md` · `security-guidelines.md` · ADR (mutation pipeline + tenancy) · `error-handling.md` · CLAUDE.md §8/§9 · spec T-19/T-20/T-26/T-27 |

> Use this as: (a) a pre-flight read before writing any Session 3 code, (b) the invariants the code must satisfy, (c) the exit gate before merge. Tick every box honestly; an unchecked box blocks merge.

---

## 1. Authentication — behind a replaceable adapter (T-19)

- [ ] Auth.js (Credentials) is wired **only behind the `AuthenticationAdapter`** interface in `@pulse/types`; app/domain code depends on the **interface + domain-shaped principal**, never on Auth.js types.
- [ ] **Zero `next-auth` imports outside the adapter implementation** — enforced by the T-27 lint rule (`no-restricted-imports` for `next-auth`); the adapter file is the single scoped exception.
- [ ] **No custom crypto.** Password hashing/verification uses the platform/Auth.js primitives (`security-guidelines.md`); no hand-rolled hashing, no plaintext compare.
- [ ] The seeded Owner's placeholder `passwordHash` is **replaced with a real hash** before login is exercised (Session 2 left it as a non-loginable placeholder).
- [ ] The session carries the **active gym/branch context**; the authenticated route segment's layout enforces an authenticated, gym-scoped session.
- [ ] Login behaviors: valid creds → session established; **invalid creds → 401/AuthError** (no user-enumeration hints); **unauthenticated access → redirect to sign-in**.
- [ ] `AUTH_SECRET` comes from the validated env module only; never committed, never logged, never in the client bundle. Rotate on any suspected exposure.
- [ ] `auth.login` emits an audit/info log via the structured logger — **ids, never credentials/bodies**.

## 2. Authorization — permission-based, never role-based (T-20)

- [ ] Every protected action checks a **permission** (e.g. `payments.record`), resolved from the session — **never** a role name.
- [ ] **Zero** `requireRole(...)`, `role === …`, `switch(role)`, or any role-name branch — enforced by the T-27 role-name guard (grep + lint must find zero).
- [ ] `@pulse/auth` is the **sole** authorization home; no app/other package re-implements permission logic.
- [ ] Permission **keys are referenced from `@pulse/auth` constants**, never as raw string literals — enforced by the T-27 hardcoded-permission-string guard (now active beyond the seed).
- [ ] **Deny-by-default**: absence of a permission is a denial. The server **re-checks** every time, even if the UI also hides the control.
- [ ] Permission **keys are immutable** (INV-7) — never renamed/removed; deprecate by ceasing to grant.
- [ ] Dormant roles remain **unassignable** (`is_assignable=false`); only Owner/Trainer are assignable in MVP.
- [ ] The placeholder protected route demonstrates allow/deny **by permission**; **denied → 403**, **cross-tenant → 404** (not 403).
- [ ] Tests assert on **permissions, not roles**, so role re-mappings never break tests.

## 3. Mutation pipeline & tenancy (ADR — canonical)

- [ ] Every guarded mutation follows the pipeline in order: **authenticate → authorize (by permission) → validate (Zod) → scope (`gymId` from session) → execute → revalidate**.
- [ ] **Never trust scope/role/permission/`gymId` from client input.** `gymId` is taken from the session, every time.
- [ ] Every business query is **filtered by `gymId`** from the session (tenant isolation; INV-2).
- [ ] Cross-tenant access surfaces as **404**, never 403 (no existence disclosure) — `error-handling.md`.

## 4. Platform adapters — boundaries, not repositories (T-26)

- [ ] `IClock`, `IIdGenerator`, `ICurrentUser` defined in `@pulse/types`; concrete impls in `apps/web`. **Exactly these three** — `IFileStorage` stays **deferred** (no MVP consumer).
- [ ] Domain/app code depends on the **interfaces**; **no raw `Date.now()` / `crypto.randomUUID()` / Auth.js** in domain code — enforced by the T-27 fitness suite.
- [ ] Adapters return **domain-shaped values**, not framework types (no leaky abstraction).

## 5. Secrets, logging & error surface

- [ ] No secret/PII in logs — **ids, not bodies**; the Pino `redact` paths cover any new secret-bearing fields introduced this session.
- [ ] No server secret crosses to the client; only truly-public values use `NEXT_PUBLIC_`.
- [ ] Errors at the boundary map the typed taxonomy to **safe** messages + a correlation id; **no stack/SQL/internal ids** leaked; **no empty `catch {}`**; **one log per handled error**.

## 6. Tests required to land (P1 — gate "done")

- [ ] **Authentication**: unauthenticated access rejected/redirected; invalid creds rejected.
- [ ] **Authorization**: permission **present → allowed**, **absent → denied** (403); dormant role unassignable.
- [ ] **Tenant isolation**: acting as Gym A cannot read/write Gym B; cross-tenant → 404.
- [ ] **Adapters**: injectable fakes (deterministic clock/id) used in tests.
- [ ] All assertions are **permission-/behavior-based**, not role-name-based.

## 7. Mandatory review gate (R6)

- [ ] T-27 architectural-fitness checks pass for the new code (no Auth.js outside adapter · no role checks · no hardcoded permission strings · no `ui→db` · no cycles · no cross-context internal imports).
- [ ] `advisor` consulted on the non-trivial security design (adapter seam, session shape, gate helper) **before** finalizing.
- [ ] **`/security-review` run and passed** on the Session 3 diff **before** T-19/T-20 land. On any revert/re-land of the security perimeter, **re-review**; rotate `AUTH_SECRET` if ever exposed.
- [ ] Definition of Done met (CLAUDE.md §10) + this checklist fully ticked → human accepts at merge.

---

### Known carry-in from Session 2 (address early in Session 3)

- Owner `passwordHash` is a **placeholder** — set a real hash via the chosen Auth.js hashing path (item §1).
- `@pulse/auth` permission-key **constants do not exist yet** — create them in T-20 so the hardcoded-permission-string guard has a target to reference (item §2).
- The Authentication-Adapter interface is **not yet authored** — it lands in `@pulse/types` in T-19 (item §1); the `next-auth` lint ban is already configured and will then scope its single exception.

> **Approval:** when the human approves this checklist, Session 3 implementation begins. From here the focus is **code quality + security behavior**, not project infrastructure.
