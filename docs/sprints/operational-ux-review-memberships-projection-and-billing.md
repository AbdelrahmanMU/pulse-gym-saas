# Operational UX Architecture Review — Membership Projection & Billing Action

**Date:** 2026-07-02
**Branch:** `feat/platform-foundation`
**Type:** Product / UX architecture review (not a fast-delivery task). Two proposals evaluated
independently; implementation limited to read models / projections / UI / information hierarchy.
**Hard constraint (honored):** no change to lifecycle engine, payment engine, ledger, database,
schema, permissions, invariants, or business tests.

---

## Proposal 1 — "Current Memberships" projection (one visible row per member)

### The observation (accurate)
Every renewal correctly creates a **new** Membership record (immutable snapshot; predecessor
retained). The Memberships list renders **every** record, so a long-tenured member accumulates
rows: `Ahmed — ACTIVE`, `Ahmed — SCHEDULED`, `Ahmed — EXPIRED`, `Ahmed — EXPIRED`… The domain is
right; the *projection* is noisy. This is a real operational problem, not a modelling defect.

### Verdict: **MODIFY — and this is a product decision, not an engineering one.**

Not rejected. But "one visible row per member" as literally worded cannot be shipped as a pure
read-model tweak, for one decisive reason plus several structural ones:

**Decisive finding — the proposal's own fallback does not exist yet.**
The proposal says historical memberships "remain accessible from the Member Details or Membership
Timeline." They do **not**. The Member Details page (`/members/[memberId]`) today renders Contact /
Details / Responsible trainer / Lifecycle — **and no memberships at all** (not current, not
historical). The only place any membership is reachable is the global Memberships list. So
collapsing that list to one row per member **orphans every historical contract** unless we *first*
build the member-detail membership history the proposal presumes. That turns "projection only" into
"projection + a new member-detail section" — still inside the allowed change surface (read model +
UI), but materially more than described.

**Structural considerations (true of the literal collapse):**
1. **Representative-row precedence is arbitrary.** "One row per member" forces a rule for *which*
   membership represents the member (ACTIVE? most recent? SCHEDULED if no ACTIVE?). That rule is a
   product judgement, and it hides the others.
2. **A member can legitimately have two live rows.** Mid-renewal, a member has an ACTIVE period
   **and** a queued SCHEDULED period (INV-12 permits ≤1 of each). Both are current and operationally
   distinct; collapsing to one hides a real future obligation.
3. **DB-level pagination and status-filter semantics.** The list paginates at the database
   (`skip`/`take`, `PAGE_SIZE=20`) and filters by status. True per-member collapse needs group-by /
   `DISTINCT ON (member_id)`, which does not compose cleanly with Prisma pagination + count, and it
   redefines what the status filter means (filter within a member? across?).
4. **A member-centric list already exists** at `/members`. A one-row-per-member Memberships list
   substantially duplicates it.

### The honest fork (this is what needs your call)

Both options keep history reachable and stay within read-model + UI. They differ in fidelity vs.
effort:

- **Option A — Live-status default filter (minimal).** Default the Memberships list to live periods
  (derived status ∈ ACTIVE / FROZEN / SCHEDULED; exclude terminal EXPIRED & CANCELLED by default),
  with the **existing status filter** as the path to history, and update the page subtitle. Kills
  exactly the `Ahmed EXPIRED, Ahmed EXPIRED…` noise. Cheap, invariant-safe, no new access path
  needed. **Does not deliver "one row per member"** — a mid-renewal member still shows ACTIVE +
  SCHEDULED (arguably correct, but not what was asked).

- **Option B — True per-member collapse + member-detail history (honors the ask).** Collapse the
  list to one row per member (with a defined representative-precedence rule) **and** build the
  memberships/history section on Member Details that the proposal assumes. Delivers the requested
  information architecture and a better member-centric model. More work; pagination solved via
  group-by / `DISTINCT ON`, not a one-liner.

**Recommendation:** **Option A** for this slice — it removes the actual pain (terminal-history
noise) at the lowest risk and without inventing a precedence rule, and it's genuinely projection +
UI only. Option B is the better *destination* if the goal is a member-centric operational model, but
it's a larger, separately-scoped slice (it adds a new member-detail surface). Option A is *further*
from the literal wording than B; that's why this is your decision, not mine to assume.

### Human decision (2026-07-02): **Option A — implemented.**

The Memberships list now defaults to a `LIVE` projection (current periods: Active not-yet-ended +
any Frozen/Scheduled); terminal Expired/Cancelled history is hidden until explicitly filtered. The
status filter gains **Current** (default) and **All (incl. history)**; every concrete status remains
selectable to view history. Changed files (read-model + UI only):

- `modules/memberships/validation.ts` — `status` enum gains `LIVE` (the `.catch` default); `ALL`
  retained for full history. Read-model projection, not a stored value.
- `modules/memberships/service.ts` `listMemberships` — `LIVE` adds a WHERE that excludes cancelled
  and includes only not-yet-ended Active plus any Frozen/Scheduled. Uses the time-independent
  `cachedEffectiveEndDate` (`@db.Date`, index-backed by `[gymId, cachedStatus, end]`); the per-row
  badge is still derived live. No other query, mutation, or invariant touched.
- `modules/memberships/ui/memberships-toolbar.tsx` — `Current` (default, clean URL) + `All (incl.
  history)` filter options.
- `app/(app)/memberships/page.tsx` — default status `LIVE`, subtitle + empty-state copy reflect the
  current-periods view.
- `modules/memberships/validation.test.ts` — the `.catch`-default assertion tracks `ALL → LIVE`
  (the deliberately-changed default; not a business-invariant test).

**Explicitly NOT built (deferred to Option B if pursued):** true one-row-per-member collapse and the
Member-Details memberships/history section. Under Option A a mid-renewal member correctly shows two
live rows (Active + Scheduled).

### Why no business behavior changes under either option
Both touch only the **read projection**: the `where`/default filter and presentation. No membership
is created, mutated, hidden from the domain, or re-derived differently. Status is still derived live
per row. Renewal, freeze, cancel, snapshots, INV-12/13, and every lifecycle test are untouched.

**Status: Option A chosen (2026-07-02) and implemented + verified.**

---

## Proposal 2 — Retire the payment action once nothing is owed

### The observation (accurate)
Membership Details always renders Billing → Payment Summary → **Record Payment**, even after
Remaining reaches 0. Offering "Record Payment" against a fully-paid membership invites a needless
action and reads as unfinished.

### Verdict: **ACCEPTED — implemented.**

The change is purely presentational and provably preserves every business guarantee:

- **Partial payments preserved.** The form still shows for PENDING and PARTIALLY_PAID. It is retired
  **only** when standing is PAID.
- **Ledger correctness preserved.** `recordPayment` remains status-independent and fully permitted
  server-side; nothing about the append-only ledger, void, or money math changes. We only stop
  *offering* the UI affordance when nothing is owed.
- **Keyed off the derived value, not a fresh compare.** The passive state triggers on
  `billing.standing === PaymentStanding.PAID`. `deriveStanding` already defines PAID as
  `totalPaid >= price`, so this covers exact-paid **and** overpaid/credit — no second remaining>0
  computation, consistent with the standing badge.
- **Reversible by construction.** If a payment is later **voided** (the void control lives in Payment
  History, untouched), standing re-derives away from PAID and the Record Payment form returns on the
  next render. Nothing is latched.
- **No legitimate case to keep the form at PAID.** Payment is strictly against the membership's
  snapshot price; once satisfied, no further money is owed on that contract. A renewal/upgrade is a
  **new** membership with its own Billing section and its own Record Payment.

### Implementation (minimal, catalog + tokens)
`apps/web/src/app/(app)/memberships/[membershipId]/page.tsx` — when `canRecordPayment` and standing
is PAID, the `RecordPaymentForm` is replaced by a quiet confirmation (a `CircleCheck` icon in
`text-success-text` + label "Paid in full — no balance due" in `text-muted-foreground`). It
**complements** the existing "Paid" `PaymentStandingBadge` in the summary rather than repeating it
as a loud banner (Design System §3: icon + label + `*-text` token, never colour alone). No new
component; no engine, ledger, permission, or test-logic change.

### Verification
- `type-check` ✅  · `lint` ✅  · unit tests **178/178** ✅
- Production `build` blocked only by the known Windows `.next\trace` EPERM lock held by the running
  dev server (environment, not code); `tsc --noEmit` — the same compiler — passes clean.

---

## Summary

| Proposal | Verdict | Status |
|---|---|---|
| 1 — Current Memberships projection | **MODIFY** → Option A (human-chosen 2026-07-02) | Implemented + verified |
| 2 — Retire payment action when Paid in Full | **ACCEPTED** | Implemented + verified |
