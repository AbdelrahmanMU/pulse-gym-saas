# Sprint 1 · Epic 4 — Membership Lifecycle · Verification Report

| | |
|---|---|
| **Status** | ✅ Implemented · all gates green · awaiting human acceptance |
| **Branch** | `feat/platform-foundation` (not merged/tagged) |
| **Gate** | type-check ✓ · lint + fitness ✓ · unit 123 ✓ · integration 68 (+2 todo) ✓ · build ✓ |
| **Scope** | Create · View (+timeline) · Renew · Upgrade/Downgrade (deferred) · Freeze · Resume · Cancel |

> No schema or migration change (every column + the GiST exclusion, partial-uniques, and CHECKs shipped in the init migration). No new permission key, dependency, abstraction, or pattern. No `AuditLog` writes (that pattern is unapproved — like plans/members).

---

## 1. Lifecycle verification
The complete lifecycle is a single `modules/memberships` vertical slice mirroring plans/members: explicit-`principal` service core → thin `"use server"` actions → RSC queries → catalogued UI. Every command runs **authorize (by permission) → validate (Zod) → scope (`gymId`, cross-gym → 404) → execute (in a `Serializable` tx) → revalidate**. Time is judged in the **gym time zone** via an injected `IClock` (no `new Date()` in `modules/**` — fitness-enforced).

## 2. State-transition verification
Status is **derived** (`lifecycle.ts`), never read from `cached_status`. Transitions proven by `lifecycle.test.ts` (10) + integration:
- (none)→ACTIVE (sale), ACTIVE→EXPIRED (day after inclusive end, T-3), ACTIVE→FROZEN→ACTIVE, ACTIVE→CANCELLED, (none)→SCHEDULED→ACTIVE.
- **Crux (advisor #1):** a successor is SCHEDULED while its predecessor is **non-terminal**, and activates only when the predecessor is EXPIRED/CANCELLED **and** today ≥ its own start — keyed on the predecessor's *derived* state, never the stored `scheduledEffectiveFrom`. The freeze-extension overlap case is explicitly tested (a freeze that pushes the predecessor's effective end past the successor's planned date does **not** cause early activation → INV-13 holds).
- Forbidden transitions enforced: Cancelled is terminal (renew/cancel refused — INV-17); EXPIRED can't be frozen (FRZ-4) or cancelled.

## 3. Timeline verification (Decision C)
`buildTimeline` composes a read-only, append-only narrative purely from immutable records (created/activated/frozen/resumed/cancelled) + the freeze rows — **no events table**. Rendered by `membership-timeline.tsx` with `<time>` dates. No business logic in the view.

## 4. Membership-scheduling verification
Deferred upgrade and early renewal both create a **SCHEDULED** successor with `scheduledEffectiveFrom = day after the current effective end`, a `predecessorMembershipId` link, and a fresh snapshot. INV-12 (≤1 SCHEDULED) is a write-path check in the `Serializable` tx against freshly-derived status; a second scheduled period is refused (integration). **Activation is persisted only on the write path** (advisor #2/#4); reads derive live and never write — the auto-activation P0 asserts on the derived view-model status after advancing the fake clock.

## 5. Freeze / Resume verification (FRZ-2 / INV-18)
Freeze requires a derived-ACTIVE membership (FRZ-4), opens one `MembershipFreeze` (partial-unique ≤1 active), and sets `cachedStatus=FROZEN`. Resume (gated by `memberships.freeze` — **Decision B**) finalizes `frozenDays = dayDiff(freezeStart, today)` (the clock was stopped `[start, today)`), accumulates `cachedTotalFrozenDays`, and recomputes `cachedEffectiveEndDate = originalEndDate + totalFrozenDays` (originalEndDate is immutable). Integration proves: freeze 10 / early-resume after 3 days → exactly 3 frozen days applied, end extended Jan-31→… +3, freeze row ENDED with `actualEnd`.

## 6. Upgrade verification (UPG-1..3 / INV-16)
Current period **untouched** (no proration/refund — UPG-3, asserted). New plan SCHEDULED for the day after the current end; `origin = UPGRADE` when target price ≥ current snapshot price else `DOWNGRADE`. Requires a derived-ACTIVE current period and an **active** target plan (PLN-2).

## 7. Renewal verification (REN-1..4)
Start = **later of today or the day after the current end**: early renewal → SCHEDULED from day-after-end; after expiry → immediate ACTIVE from today (both asserted). Cancelled memberships can't be renewed (REN-4). Renewal re-snapshots the **current** plan terms (REN-3) and never mutates the predecessor (append-only — INV-19).

## 8. Authorization verification
Permission-based only; no role-name branch (fitness rule ② passes). Each action gated by its key — `memberships.read/create/renew/upgrade/freeze/cancel` — with **allow AND deny** integration tests per action. Resume reuses `memberships.freeze` (no `memberships.resume` key invented — INV-7).

## 8a. Accessibility & responsive (DoD §10)
Not independently exercised this epic (no per-epic e2e/axe run) — **consistent with the Epic 2/3 gate**. A11y and responsiveness rest on **reuse of catalogued components only** (DataTable, StatusBadge, FormField/FormLayout, SelectInput, MetricValue, PageHeader/PageContainer — each carrying the Design System v1.1 §7 contract: label/aria wiring, status by icon+label+token never colour alone, focus ring, responsive reflow) plus the **token-compliance fitness test** (no hex/px/arbitrary values). New status surfaces (MembershipStatusBadge, timeline) follow the same icon+label+token rule. No bespoke UI was introduced.

## 9. Architecture-fitness verification
`npm run lint` + the fitness suite pass: no cycles, no package→app imports, no `ui→db`, no cross-context imports, no hardcoded permission literals, no `new Date()` in `modules/**`, no `requireRole`/role-name checks. The client `membership-lifecycle-controls` imports `MembershipStatus` **type-only** so the server-only `@pulse/db` (pg driver) never enters the client bundle (build verified).

## 10. Database-invariant verification
- **INV-1/2** tenant isolation: cross-gym read + every mutation → `NotFoundError` (404).
- **INV-12** ≤1 ACTIVE / ≤1 SCHEDULED: write-path guard in `Serializable`; second active and second scheduled both refused.
- **INV-13** no overlap: derivation keys activation off predecessor terminality; the GiST `memberships_no_overlap_excl` is the DB backstop (incidentally observed rejecting an overlapping insert during test authoring).
- **INV-14 / M-8** snapshot immutability: editing the source Plan after creation does **not** change the membership snapshot (asserted).
- **INV-17** cancel terminality; **INV-18** frozen-days extension; **INV-19/39** append-only (corrections are new records / closed freeze rows, never edits).

## Product Demo Checklist
- [x] **Create** — sell a plan to a member; end date + status derived from the snapshot (inclusive end).
- [x] **View** — member, plan snapshot, derived status, remaining days (gym-tz), responsible trainer, timeline.
- [x] **Renew** — early (queued) and after-expiry (immediate) start-date math.
- [x] **Upgrade/Downgrade** — deferred; current untouched; SCHEDULED next period auto-activates on expiry.
- [x] **Freeze** — pause an active membership for N days.
- [x] **Resume** — early resume finalizes frozen days and extends the end date.
- [x] **Cancel** — terminal; access ends; member can be sold a new membership.
- [x] **Timeline** — read-only lifecycle history.

---

## ⚑ Flagged for human veto (decisions taken, not guessed)
1. **Decision A — activation mechanism.** No sweep/cron (out of scope). Status derived live on read; activation persisted only in write-path transactions; **no write-on-GET**. The list filter uses `cached_status` as an accelerator with per-row live re-derivation of expiry (so ACTIVE→EXPIRED drift shows); a just-due SCHEDULED row may read stale on the *list* until any write reconciles it — the **detail** view is always live-correct. Acceptable at MVP scale; a future daily sweep would back a scalable list.
2. **Decision B — Resume permission = `memberships.freeze`.** No `memberships.resume` key was invented (INV-7). Confirm this is the intended gate.
3. **Decision C — Timeline = composed read-only** from immutable records (no events table).
4. **Captured fields with no column (omitted, not faked — would be a forbidden schema change):** membership **Notes**, a membership-level **Responsible Trainer** (the trainer is a member-level relationship owned by the members module — INV-37; the detail shows the member's current trainer read-only), **Freeze Reason**, **Cancellation Reason**. Each needs a future migration if the business wants it stored.
5. **Underspecified interactions (defensible defaults):** (a) freeze while a SCHEDULED successor exists → **allowed** (predecessor-gated activation keeps it safe); (b) cancelling a predecessor with a SCHEDULED successor → the successor **keeps its own start date and activates then** (member paid for that future period).
