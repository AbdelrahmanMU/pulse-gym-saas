# Sprint 1 · Epic 9 — User & Staff Management — Implementation Brief

**Mode:** Fast Delivery · branch `feat/platform-foundation` · 2026-07-01
**Goal:** The operational workforce model — a dedicated Staff vertical slice over the existing
`User` / `GymUser` / `Role` model, reusing the existing auth, authorization, adapters, and catalog.
No schema change.

## Scope (required features → how)
- **Staff List / Details** — `staff.read`; gym-scoped, paginated, search + status filter.
- **Create Staff** — `staff.invite`; creates a `User` (owner-set temporary password, hashed via the
  existing `hashPassword`) + `GymUser` (role, `ACTIVE`) in one transaction. **No email infra.**
- **Edit Staff** — `staff.manage`; edits the User's display name + phone.
- **Suspend / Reactivate Staff** — `staff.manage`; `ACTIVE ⇄ REVOKED` (+ `revokedAt`).
- **Role Assignment** — `roles.manage`; sets `GymUser.roleId` to an **assignable** role.
- **Permission-based visibility** — nav + every control shown by permission, never by role.
- **Last Login** — display `User.lastLoginAt`; **wired**: the sign-in `authorize` path now stamps it
  (verified login-only, no re-resolution on token refresh).

## Key decisions (loud — human-vetoable)

### D-1 — Lifecycle = the documented `ACTIVE / REVOKED`, not the sketched 4-state flow
The prompt sketches Pending→Active→Suspended→Archived, but `GymUserStatus` is **`{ACTIVE, REVOKED}`**
(+ `revokedAt`), and no `STF-*` rule or state-machine defines a richer staff lifecycle. Per the
prompt's own tiebreaker ("follow the documented model instead of creating a new one"), this Epic
implements **one reversible deactivation** (`REVOKED`), surfaced as **"Suspended"** in the UI:
- **Suspend** = `ACTIVE → REVOKED`; **Reactivate** = `REVOKED → ACTIVE`.
- **Pending** (invite-accept) and a **distinct terminal Archive** are **NOT invented** — each needs an
  enum value + migration + ADR (and Pending needs email/invite infra). **Flagged as future**, per
  "identify the gap instead of inventing it." Suspend already blocks login (the credentials resolver
  gates on `status == ACTIVE`), so REVOKED covers the operational need.

### D-2 — Staff management is Owner-only in MVP
Only **Owner** holds `staff.invite` / `staff.manage` / `roles.manage`; **Manager** holds `staff.read`
(view). Consistent with Notifications/Reports being Owner-only. Dormant roles unchanged.

### D-3 — INV-36 revoke-side (closes TD-5), with a surfaced consequence
Suspending a staff member who is a responsible trainer **clears their open trainer assignments**
(INV-36) via a **new members public function** `unassignAllForTrainer` (composed cross-context
through `@/modules/members`). New assignments to a suspended trainer are already impossible
(`listAssignableTrainers` filters `status: ACTIVE`). **Consequence surfaced in UI + report:** because
suspend is reversible but the un-assignment is not, a suspend→reactivate cycle leaves the trainer
with an empty roster; the suspend control states "this also unassigns them from their members."
Executed sequentially after the status flip (benign window — a REVOKED trainer can't act).

### D-4 — Temporary credentials (no email)
The Owner sets an **initial temporary password** in the create form (min length only — full strength
policy is the standing Phase-2 gap, TD-10). Hashed via `hashPassword`; the plaintext is **never
logged** and the Owner communicates it out-of-band. **Password-change-on-first-login is NOT in the
model** (no `mustChangePassword` field) → documented as future, not invented.

### D-5 — Self-lockout guard
An actor cannot **suspend** or **change the role of** their own `GymUser` (prevents self-lockout).
Last-active-owner quorum protection is left as a future refinement (not over-engineered for MVP).

## Architecture
New `apps/web/src/modules/staff/**` — `validation → service → actions → queries → ui` (the Epic
pattern). Explicit-`principal` service core (authorize by permission → validate (Zod) → scope `gymId`
→ `assertSameGym`→404 → execute → revalidate). Time via the injected `IClock`. Cross-module reads
only via public `index.ts`. Catalog components + tokens only; server-rendered tables (no
`@pulse/db` enum in a client bundle). Routes `(app)/staff/{,new,[gymUserId],[gymUserId]/edit}`; nav
"Staff" gated by `staff.read`.

## Verification
Permission (allow+deny per action) · tenancy (cross-gym 404) · lifecycle (suspend/reactivate,
idempotent, self-guard) · INV-36 assignment clear · email-unique · last-login stamp · integration
tests (live DB) · architecture fitness · a11y (reuse verified primitives) · build.
