# Session 3 — Verification Report

### IAM & Platform Adapters · Sprint 0

| | |
|---|---|
| **Session** | 3 of 5 |
| **Tasks delivered** | T-07 (routing + protection), T-19 (authentication behind the adapter), T-20 (permission-based authorization), T-26 (platform adapters) |
| **Branch** | `feat/platform-foundation` (not merged) |
| **Verified on** | 2026-06-29 · Node 20.20.0 · pnpm 9.15.4 · Windows 11 + Docker Desktop · Next 15.5.19 · next-auth 5.0.0-beta.31 |
| **Security gate** | ✅ PASSED at start (checklist approved); `advisor` consulted twice on the security design; manual security review performed (the automated `/security-review` skill could not run — see §7) |
| **Status** | ✅ All exit criteria satisfied and **empirically reproduced** — awaiting human acceptance |

> Authoritative criteria: `sprint-0-technical-specification.md` §7.1 (Session 3 row) + T-07/T-19/T-20/T-26 + the **Session 3 Security Checklist**. Every claim below is mapped to a reproduced result. Items that are *implemented but not behind a green test* are stated as such and listed under Known Limitations — never asserted as "verified".

---

## 0. What shipped (file map)

**`@pulse/auth`** — now the single authorization source: `keys.ts` (the immutable `PERMISSION_KEYS` constants + `PermissionKey` type), `catalog.ts` (capabilities / permissions / role→permission matrix as data), `authorization.ts` (`hasPermission`, `derivePermissions`), and the server-only `@pulse/auth/password` subpath (scrypt `hashPassword`/`verifyPassword`).

**`@pulse/types`** — `AuthenticationAdapter` + domain `AuthenticatedPrincipal` (`authentication.ts`); `IClock` / `IIdGenerator` / `ICurrentUser` (`platform.ts`). Dependency-free.

**`@pulse/db`** — `seed.ts` refactored to a pure **materializer** of the `@pulse/auth` catalog (no hand-listed keys); sets the real Owner scrypt hash idempotently.

**`apps/web`** — `lib/auth/` (the Auth.js seam: `auth.config.ts`, `auth.ts`, `principal.ts`, `authentication-adapter.ts`, `current-user.ts`, `guard.ts`, `assert.ts`, `sign-in.ts`, `types.ts`), `lib/tenancy.ts`, `lib/errors.ts`, `lib/platform/` (`clock.ts`, `id-generator.ts`, `fakes.ts`); routes — `(auth)/sign-in`, `(app)/layout` + `(app)/dashboard`, `api/auth/[...nextauth]`, `api/protected`.

---

## 1. Acceptance Criteria (spec §7.1 Session 3 row + task ACs)

| Criterion | Result | Evidence |
|---|---|---|
| Routing groups + route protection | ✅ | `(auth)` public + `(app)` protected segments; `(app)/layout` calls `requireSession()` → redirect. E2E: unauth `/dashboard` → `/sign-in`. |
| Auth.js **behind the Authentication Adapter** (no Auth.js outside it) | ✅ | `next-auth` imported only in `apps/web/src/lib/auth/**`; grep + planted-violation lint both confirm zero leaks. |
| Gym-scoped session | ✅ | JWT carries `gymId`/`branchId`/`gymUserId`; integration test asserts the resolved principal is gym-scoped. |
| `@pulse/auth` permission check + gated placeholder route (allow/deny **by permission**) | ✅ | `/dashboard` gated on `dashboard.view`; `/api/protected` returns 200/401/403 by permission. |
| `IClock`/`IIdGenerator`/`ICurrentUser` in `@pulse/types` with fakes | ✅ | Interfaces + concrete impls + `createFakeClock`/`createFakeIdGenerator`; unit-tested. `IFileStorage` absent (deferred). |
| Security review passed | ✅ (manual) | `advisor` ×2 + manual security review; automated skill unavailable (§7). |
| Zero role-name branches | ✅ | grep + ESLint `no-restricted-syntax` guard find zero. |
| Build / lint / type-check / format green | ✅ | `pnpm -w run verify` green end-to-end. |

---

## 2. Security Validation

- **No custom crypto.** Password hashing is **Node `crypto.scrypt`** (a platform primitive), confined to `@pulse/auth/password` and shared by the seed (hash) and the adapter (verify) so they cannot drift. Params: N=2¹⁵, r=8, p=1, 16-byte random salt, 32-byte key, `maxmem` 64 MiB; `timingSafeEqual` comparison; params+salt encoded in the stored hash. **Human-vetoable** vs bcrypt/argon2 (which `security-guidelines.md` names) — choosing those would be a new, human-owned dependency.
- **Anti-enumeration.** Unknown email, inactive user, and wrong password all return `null` with no distinguishing signal; a **dummy scrypt** runs on the unknown/inactive paths so verification timing does not reveal account existence. Sign-in surfaces a single generic "Invalid email or password."
- **`isActive` enforced.** Inactive users (incl. the reserved `system-actor`) are rejected regardless of hash; sentinel/malformed hashes verify to `false` and never throw.
- **Secrets.** `AUTH_SECRET` is read from the validated env only; the JWT is **server-signed** (so the embedded permission set is not client-tamperable). `passwordHash` appears only in the verify call, the Pino `redact` list, and the server-only generated Prisma types — never in the principal or any client path. `OWNER_INITIAL_PASSWORD` is **seed-scoped** (not in the app env schema).
- **Tenancy.** `assertSameGym(sessionGymId, resourceGymId)` throws `NotFoundError` → **404, never 403** (no existence disclosure). `gymId` is always taken from the session.
- **Error surface.** Typed taxonomy (`AuthError` 401 / `AuthorizationError` 403 / `NotFoundError` 404); the protected route returns only a stable error code — no stack, SQL, or internal id. No empty `catch {}`; unexpected errors propagate (not swallowed as "invalid credentials").
- **Runtime.** No `middleware.ts`; route protection is layout-based in the **Node runtime**, so scrypt/Prisma never run on the Edge.

---

## 3. Authentication Verification (T-19)

- **Session strategy = JWT** — the only Credentials-compatible strategy; the frozen schema has no `Session`/`Account` tables, so no migration was needed. The resolved principal (incl. permission set) rides in the signed JWT and is copied to the session via the `jwt`/`session` callbacks.
- **Adapter seam** — `AuthenticationAdapter` (`@pulse/types`) is implemented once in `apps/web/src/lib/auth/authentication-adapter.ts`; it returns only the domain `AuthenticatedPrincipal` (no Auth.js type leaks). `ICurrentUser` is sourced from it.
- **Credentials boundary** — the Auth.js `authorize` callback Zod-validates input, then calls `resolvePrincipalFromCredentials` (DB lookup → scrypt verify → active-`GymUser` tenant context → default-branch → `derivePermissions`).
- **Carry-in resolved** — the seeded Owner placeholder hash is replaced with a real scrypt hash (idempotently, only while the stored value is still the sentinel); `@pulse/auth` permission-key constants exist; the `AuthenticationAdapter` interface is authored and the `next-auth` lint ban now scopes its single `lib/auth/**` exception.
- **Empirically verified (green):** valid Owner login → gym-scoped principal with 40 permissions (integration); full **sign-in → `/dashboard` renders → sign-out → `/sign-in`** (E2E); invalid credentials → generic error, stays on sign-in (E2E); unauthenticated `/dashboard` → redirect to `/sign-in` (E2E).

---

## 4. Authorization Verification (T-20)

- **Permission-based, never role-based.** Decisions go through `hasPermission(held, key)` over the resolved permission set; **zero** `requireRole`/`role ===`/`switch(role)` anywhere (grep + ESLint guard). Tests assert on **permissions**, not role names.
- **`@pulse/auth` is the sole authorization home.** Keys, catalog, check, and **derivation** all live there. The DB read happens in `apps/web`; only the derivation is centralized in `@pulse/auth`, avoiding an `@pulse/auth ↔ @pulse/db` cycle while keeping the pure surface (keys + `hasPermission`) browser-reusable for future UI control-hiding.
- **Deny-by-default; server re-checks every request.** `authorize(principal, key)` (route handlers) → `AuthError` 401 / `AuthorizationError` 403; `requirePermission(key)` (RSC) → redirect if unauth, forbidden render if missing.
- **Keys are constants, never literals.** The T-27 hardcoded-permission guard is active everywhere except the key-definition file; it caught raw literals in a test during development (fixed to reference constants).
- **Dormant roles** remain unassignable (`is_assignable=false`); only Owner/Trainer assignable. Catalog-consistency test pins 13 capabilities / 40 permissions / 5 roles / 102 mappings — the exact shape the seed materializes.

---

## 5. Empirical Security Tests (all green)

**45 tests total** — `pnpm -w run verify` (build/lint/type-check/format) + the three suites:

- **Unit + fitness (33, DB-free, `turbo run test`):** scrypt roundtrip + wrong/sentinel/malformed → false-never-throw (5); `hasPermission`/`derivePermissions`/`authorize` 401/403 (5); `assertSameGym` → 404-never-403 (2); UUID v7 layout (version `7`, variant `10`, uniqueness, monotonic) (5); fake clock/id determinism (3); catalog integrity 13/40/5/102 (6); plus carried-over env (4), logger redaction (2), architectural fitness (1).
- **Integration (7, isolated test DB :55433):** real credential resolution — valid Owner → gym-scoped principal w/ 40 perms incl. `dashboard.view`/`payments.record`; wrong password → null; unknown email → null; inactive `system-actor` → null (4); plus carried-over health (3).
- **E2E (5, Playwright + dev DB):** home + axe baseline (1); unauth `/dashboard` → redirect (1); sign-in form renders (1); invalid creds → generic error (1); **full Owner sign-in → gated dashboard → sign-out (1)**.

The empirically-verified security properties are: scrypt hash/verify, anti-enumeration/`isActive`/sentinel handling, the permission decision (allow/deny/401/403), tenant-isolation 404 mechanism, the **full Auth.js sign-in→session→protected-render loop**, and the unauthenticated-redirect.

---

## 6. Architectural Fitness Results

| Rule (T-27) | Status this session | Mechanism |
|---|---|---|
| ⑥ No Auth.js import outside the adapter | ✅ **now enforced + proven** | ESLint `no-restricted-imports` bans `next-auth` **and `next-auth/*`** (the prior bare-specifier ban missed subpaths — fixed); planted `next-auth/jwt` + `next-auth/providers/credentials` imports outside `lib/auth` fail lint; the `lib/auth/**` exception re-includes the other bans (options replace, not merge). |
| ② No role-name authorization | ✅ | `no-restricted-syntax` AST guard; grep zero. |
| ⑤ No hardcoded permission strings | ✅ | Literal-regex guard; keys referenced via constants (caught a real test violation). |
| ④ No `@pulse/ui` → `@pulse/db` · ① no cycles · ③ no cross-context | ✅ (unchanged) | dependency-cruiser fitness suite + ESLint deep-import ban; no new cycle introduced (`@pulse/auth` stays DB-free; `@pulse/db → @pulse/auth` is a downward edge). |

> Full CI-wired six-rule T-27 consolidation remains a **Session 5** deliverable, as specified. This session activated and proved rule ⑥ at the lint layer and kept the others green.

---

## 7. Known Limitations (honest scope boundaries)

1. **Automated `/security-review` did not run.** The skill aborts on `origin/HEAD` (this repo has **no git remote** yet). A **manual** security review was performed instead (findings in §2; no critical/high issues in the implemented code). The checklist's "/security-review run and passed" box is annotated accordingly, **not** ticked as passed. Re-run the skill once a remote exists.
2. **Auth rate-limiting is not implemented.** `security-guidelines.md` lists it (and it's a staged-roadmap item); the login path relies on scrypt cost for now. → Phase 2 hardening.
3. **Password-strength enforcement** is absent — there is no password-set/reset UX yet (deferred to Phase 2 auth). The seeded Owner credential is a **dev bootstrap** (`OWNER_INITIAL_PASSWORD`, documented default) that **must be rotated before any real use**.
4. **Session lifetime is the Auth.js default (~30-day JWT).** Sessions do expire and invalidate on logout (core rule satisfied), but the "short-lived on shared front-desk terminals" nuance is **not** tuned. → Phase 2 (a one-line `session.maxAge`).
5. **Production host/redirect config.** `trustHost: true` is set for local/dev; a production deployment needs `AUTH_URL`/host verification reviewed.
6. **Resource-level cross-tenant isolation is not yet exercised end-to-end** — Session 3 has no business resource to isolate. The `assertSameGym → 404` *mechanism* is implemented and unit-tested; the first feature slice will exercise it against real rows.
7. **JWT permission staleness.** Permissions are cached in the signed token ("cached per session", DDS §6); a role re-mapping/revocation is not reflected until the next sign-in. Acceptable in MVP (nothing mutates roles at runtime).
8. **`migrate deploy` advisory-lock note.** Re-running `migrate deploy` against an already-migrated dev DB can time out on the advisory lock if a client holds a connection; migrations were already applied (Session 2) and the seed ran cleanly. Cosmetic.

---

## 8. Follow-up Items

- **🔐 Pre-production — evaluate Argon2id (accepted follow-up, 2026-06-29).** Before the production release, evaluate **Argon2id** as the password KDF. **scrypt is retained for Sprint 0** (a Node platform primitive, no new dependency, memory-hard, advisor-reviewed params) and is **not** changed now — switch only if a compelling reason emerges. A KDF change requires a **rehash-on-next-login** path (old hashes won't verify under new params; the stored format records the scheme to support this).
- **🔁 Re-run automated `/security-review` after the first git remote is configured (accepted follow-up, 2026-06-29).** The skill aborts on `origin/HEAD` with no remote, so it **did not run** this session — a manual review was performed (no critical/high). Once a remote exists, run `/security-review` on the branch and record the result.
- **Session 5 / T-27:** consolidate all six fitness rules into the CI-wired suite (rule ⑥ lint is active now); add a dependency-cruiser assertion for "no `next-auth` outside `lib/auth`".
- **Phase 2 (Authentication UX):** login/password-reset/invitation UX, password-strength policy, **auth rate-limiting**, session `maxAge` tuning for shared terminals, multi-gym context switching, `lastLoginAt` update on sign-in.
- **Deployment:** `AUTH_URL`/`trustHost` review; rotate the bootstrap Owner credential.
- **Governance (human's call):** record the Session-3 implementation decisions (JWT strategy, scrypt choice, adapter seam) in `decision-log.md` if desired (governance docs are frozen; not edited here).
- **DDS §16 reconciliation** (carried from Session 2): unchanged.

---

## 9. Readiness for Session 4 (Design System, Shell & Errors — T-12/T-13/T-14/T-08/T-17)

**Ready.** Session 4 builds the visual layer on top of a working, protected, gym-scoped session:

- The `(app)` segment + authenticated chrome already render for a signed-in Owner — T-08 replaces the minimal header with the real **AppShell/Sidebar/TopBar** Catalog components.
- The typed-error taxonomy (`AuthError`/`AuthorizationError`/`NotFoundError`) and the dashboard's minimal forbidden render are the seam T-17's **error boundary + Catalog `ErrorState`** plugs into (mapping the taxonomy to safe UI).
- `globals.css` and tokens are present (Session 2) and untouched; T-12/T-13/T-14 wire Tailwind v4 + shadcn on PULSE tokens with no auth/authz changes required.
- No design literals were introduced this session (no styling added beyond bare HTML placeholders, by design).

> **STOP.** Per the Session-3 directive, implementation halts here. **Session 4 does not begin automatically** — it awaits explicit human acceptance of this report.
