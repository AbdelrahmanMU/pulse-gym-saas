# Sprint 1 · Epic 9 — User & Staff Management — Verification Report

**Status:** IMPLEMENTED + VERIFIED · Fast Delivery · branch `feat/platform-foundation` · 2026-07-01
**Scope delivered:** a dedicated Staff vertical slice (`apps/web/src/modules/staff/**`) over the
existing `User` / `GymUser` / `Role` model — list, details, create, edit, suspend, reactivate, role
assignment, permission-based visibility, and last-login — **with no schema change**. See the
`sprint-1-epic-9-staff-management-brief.md` for the decisions (D-1…D-5).

## Verification method
Every mutation is proven at the **service** layer with live-DB integration tests (explicit
`principal` → authorize/validate/scope). Routes are thin. A11y rests on reuse of the axe-verified
catalog primitives (stated honestly below). Gate re-run after every change.

| Gate | Result |
|---|---|
| `pnpm type-check` | ✅ green |
| `pnpm lint` (all T-27 fitness: no-cross-context, no-role-checks, token-compliance, ui-layering, no-ui→db) | ✅ green |
| `pnpm format:check` | ✅ green |
| `pnpm build` | ✅ 5/5 tasks (all `/staff` routes compile & emit) |
| `pnpm --filter @pulse/web test` (unit + fitness) | ✅ **178 passed** — incl. `architecture.test.ts` (no cycles, no cross-context) proving the staff→members public-index edge clean |
| `pnpm --filter @pulse/web test:integration` | ✅ **94 passed** (+18 new in `staff.test.ts`) |

## 1. Permission verification (by permission, never role)
- Nav "Staff" + every control shown by permission (`staff.read` view · `staff.invite` create ·
  `staff.manage` edit/suspend/reactivate · `roles.manage` role assignment). No role-name branch
  anywhere (the `no-role-checks` fitness passes).
- **Allow + deny** tested per action: create denied without `staff.invite`; list denied without
  `staff.read`; update/suspend denied without `staff.manage`; role assignment denied without
  `roles.manage` — each `rejects → AuthorizationError`.
- **MVP reality (D-2):** only Owner holds the mutation permissions; Manager holds `staff.read`
  (view). Staff management is effectively Owner-only, consistent with Notifications/Reports.

## 2. Tenancy verification
- Every read/mutation scopes by `principal.gymId`; a `GymUser` is loaded then `assertSameGym`.
- Tested: `listStaff` returns only the actor's gym; a cross-gym `GymUser` id → **404**
  (`NotFoundError`, never 403).

## 3. Lifecycle verification (documented `ACTIVE ⇄ REVOKED` — D-1)
- **Suspend** sets `REVOKED` + `revokedAt`; **Reactivate** restores `ACTIVE` + clears `revokedAt`;
  both **idempotent** (re-running is a no-op success) — tested.
- **Self-lockout guard (D-5):** an actor cannot suspend or change the role of their own `GymUser`
  (returns an error, state unchanged) — tested for both.
- **Suspend blocks new sign-ins** — a suspended staff member's credentials resolve to `null` (the
  existing resolver gates on `status == ACTIVE`) — tested end-to-end. **Caveat (inherited JWT
  behavior):** the principal + permissions ride the sign-in JWT and are resolved only at login,
  and `auth.config.ts` sets no `session.maxAge` (NextAuth default) with no middleware re-check — so
  a suspend (and a role change) takes effect on the target's **next sign-in**; an already-active
  session persists until its JWT expires. This is the documented "staleness until re-login" model;
  tightening it (short `maxAge` for shared terminals / a session-revocation check) is **TD-10**, not
  this Epic.
- **Pending / distinct-Archive are NOT implemented** — not in the model; flagged as future (D-1),
  not invented.

## 4. INV-36 revoke side (closes TD-5)
- Suspending a responsible trainer **clears their open member assignments** via the new members
  public `unassignAllForTrainer` (composed through `@/modules/members`) — tested: a member's
  `trainerGymUserId` becomes `null` after the trainer is suspended. New assignments to a suspended
  trainer were already impossible (`listAssignableTrainers` filters `status: ACTIVE`).
- **Consequence surfaced** (not silent): the suspend control states it unassigns the person from
  their members and that this isn't restored on reactivation.

## 5. Authentication reuse (temporary credentials + last login)
- **Create** hashes the owner-set temporary password with the existing `hashPassword` (verified:
  stored hash is `scrypt$…`, never contains the plaintext) and the created staff member **can sign
  in** — tested via `resolvePrincipalFromCredentials`.
- **Last login** — `User.lastLoginAt` is now **stamped on sign-in** (wired into the Credentials
  `authorize` path only, verified login-only — no re-resolution on token refresh) and displayed on
  the list + detail. Tested: sign-in sets `lastLoginAt`.
- **First-login password change is NOT in the model** (no field) → documented as future, not
  invented. The plaintext temp password is never logged.

## 6. Architecture fitness
- New slice follows the Epic pattern `validation → service → actions → queries → ui`; `app/` routes
  are routing-only. Explicit-`principal` service core; time via injected `IClock`.
- **Cross-context:** staff composes members **only** through its public `index.ts`
  (`unassignAllForTrainer`) — `no-cross-context` + dependency-cruiser graph green, no cycle
  (members never imports staff).
- **Catalog + tokens only:** reused DataTable, StatusBadge (→ StaffStatusBadge), FormField,
  TextInput, SelectInput, FormLayout/SubmitButton, PageHeader/Container, EmptyState, ErrorState,
  Pagination, Alert. Zero new catalog components needed. Server-rendered tables (no `@pulse/db`
  enum in a client bundle); client components import only string-union types + server actions.

## 7. Build & routes
`(app)/staff/{,new,[gymUserId],[gymUserId]/edit}` all compile and emit; nav wired in the Settings
group by `staff.read`.

## 8. Accessibility (honest scope)
The staff pages **reuse the same catalog primitives that are axe-verified** in the shell/dashboard
e2e (FormField label/aria wiring, DataTable scoped headers + caption, StatusBadge icon+label+token,
ErrorState/EmptyState roles, the global focus ring) and the same responsive scaffold. They were
**reviewed by code inspection, not independently e2e-axe-scanned** — the same standing gap as the
other newer modules (**TD-7**). No a11y defect found in inspection.

## Flagged for veto / known gaps
- **D-1 lifecycle reduction** (2 states vs the sketched 4): Pending (invite-accept, needs email
  infra) + a distinct terminal Archive need an enum value + migration + ADR — **flagged, not
  invented.** The `ACTIVE/REVOKED` model is followed as documented.
- **D-2** Staff management Owner-only in MVP (dormant roles hold only `staff.read` or less).
- **INV-36 clear is sequential**, not in one transaction with the status flip (benign — a REVOKED
  trainer can't act; self-heals on retry). Noted, not over-engineered. **Latent authz coupling:**
  `unassignAllForTrainer` authorizes `assignments.manage`; today every `staff.manage` holder (Owner)
  also holds it, so suspend never fails there — but a future role with `staff.manage` and not
  `assignments.manage` would throw mid-suspend after the status flip committed. Flagged, not
  refactored (the INV-36 clear is a system consequence of suspend, not a user assignment action).
- **Suspend/role changes are not instant for active sessions** (JWT model — see §3 caveat, TD-10).
- **Last-active-owner quorum** protection not implemented (only self-suspend/self-role-change is
  guarded) — future refinement.
- **A11y (TD-7):** staff pages not independently e2e-axe-scanned.
