# Database Integrity Test Plan
### PULSE Gym SaaS · One+ database verification test per Business Invariant

| | |
|---|---|
| **Status** | ✅ Authoritative test plan (gates "done"; P0 where money/tenancy/history) |
| **Covers** | **All 40 invariants** (`business-invariants.md` INV-1…40) |
| **Honors** | testing-standards (P0 = tenancy + invariants), DDS §13 (invariant→mechanism) |
| **Layer note** | Each test is a **database-observable** check. Where an invariant is **DB-enforced** (constraint/index/CHECK/exclusion), the test asserts the DB **rejects** the violation. Where it is **write-path-enforced** (DDS §9 of the migration spec), the test asserts the **resulting DB state** is correct and that no DB constraint wrongly blocks a *valid* operation. |

> **Reading a test.** Each block lists **Invariant · Purpose · Test Scenario · Expected Result · Failure Result · Recovery Notes**. "Expected" = correct behavior; "Failure" = what a regression looks like (the defect signature); "Recovery" = how to restore integrity if the failure shipped.

---

## A. Tenancy & Identity

### INV-1 — every business record belongs to exactly one gym
- **Purpose:** No global/orphan business rows; tenancy root holds.
- **Scenario:** Inspect every business table for a NOT NULL `gym_id`; attempt to insert a Member/Plan/Membership/Payment with `gym_id = NULL`.
- **Expected:** NOT NULL rejects the insert; schema audit shows `gym_id` on all 11 business tables (exceptions: User/Permission/Capability global, Role nullable platform).
- **Failure:** A business row persists with `gym_id NULL`, or a table lacks the column.
- **Recovery:** Add NOT NULL `gym_id`; backfill from the owning relation; quarantine orphan rows.

### INV-2 — every read/write scoped by the acting gym; cross-gym impossible
- **Purpose:** Tenant isolation (P0).
- **Scenario:** Seed gym A and gym B; as A, query/update a row owned by B by id.
- **Expected:** Zero rows returned / zero rows affected (treated as not-found); `gym_id`-leading indexes back the query.
- **Failure:** B's row is read or modified under A's session.
- **Recovery:** Patch the data-access layer to always filter `gym_id`; (Phase-2) enable RLS keyed on `gym_id`; audit access logs for leakage.

### INV-3 — identifying member contact unique within a gym (not across gyms)
- **Purpose:** Per-tenant dedupe without blocking recycled contacts.
- **Scenario:** In gym A insert two **non-archived** members with the same phone; then archive the first and insert a new member reusing that phone; separately insert the same phone in gym B.
- **Expected:** 2nd active duplicate **rejected** by partial unique `(gym_id,phone) WHERE phone IS NOT NULL AND archived_at IS NULL`; reuse-after-archive **succeeds**; gym B insert **succeeds** (scoped per gym).
- **Failure:** Duplicate active contact accepted, OR reuse-after-archive blocked, OR cross-gym collision.
- **Recovery:** Create/repair the partial unique indexes (P-2/P-3); merge duplicate members.

### INV-4 — a staff user acts only within gyms they belong to (valid GymUser)
- **Purpose:** Staff scoping via GymUser.
- **Scenario:** User with no GymUser in gym A attempts an action scoped to A; also verify `UNIQUE(gym_id,user_id)` blocks duplicate memberships.
- **Expected:** No GymUser row ⇒ permission resolution yields nothing ⇒ denied; duplicate GymUser insert rejected.
- **Failure:** Action permitted without a GymUser, or duplicate GymUser persists.
- **Recovery:** Enforce GymUser lookup in authz; add the unique; revoke stray access.

---

## B. Authorization (permission-based)

### INV-5 — protected action allowed only with the required permission; no role-name branching
- **Purpose:** Permission-based authz (P0).
- **Scenario:** Grant a permission to a role via a `role_permissions` row; resolve `GymUser→Role→RolePermission→Permission`; remove the row and re-resolve. Grep the codebase/schema for any role-name branch.
- **Expected:** Access toggles purely by the **data** (mapping row); no `requireRole`/`role===`/`switch(role)` anywhere.
- **Failure:** Access depends on a role name, or persists after the mapping is removed.
- **Recovery:** Replace role-name logic with permission checks; rebuild the effective-permission read model.

### INV-6 — a role is exactly its permission set; access change = data change
- **Purpose:** Roles carry no behavior.
- **Scenario:** Add/remove `role_permissions` rows; confirm effective permissions change with **no** code deploy.
- **Expected:** Effective set = union of mapped permissions, recomputed from data.
- **Failure:** A role grants/denies something not represented in `role_permissions`.
- **Recovery:** Reconcile mappings to intended access; invalidate the permissions cache.

### INV-7 — permission keys immutable; deny by default
- **Purpose:** Stable permission vocabulary.
- **Scenario:** Attempt to UPDATE a `permissions.key`; check `UNIQUE(key)`; resolve an unknown permission.
- **Expected:** Key change is forbidden by policy (and reviewed-migration discipline); unknown permission ⇒ denied.
- **Failure:** A key is renamed/repurposed, breaking existing grants.
- **Recovery:** Restore the original key; add the new behavior as a **new** key (append-only).

### INV-8 — tenancy checked before permission; both must pass
- **Purpose:** Two independent gates (PRM-1).
- **Scenario:** Cross-gym request with a valid permission in the *wrong* gym.
- **Expected:** Tenancy fails first ⇒ not-found, regardless of permission.
- **Failure:** Permission alone grants access across gyms.
- **Recovery:** Order the pipeline tenancy→permission; add tests.

---

## C. Member

### INV-9 — a member has a name and at least one contact
- **Purpose:** Minimum member identity.
- **Scenario:** Insert member with NULL `full_name`; insert with both phone and email NULL.
- **Expected:** NOT NULL rejects nameless; CHECK `members_contact_present_chk` rejects contactless.
- **Failure:** A member persists with no name or no contact.
- **Recovery:** Add the CHECK; backfill/flag offending rows.

### INV-10 — member archived, never erased while history exists
- **Purpose:** Preserve history (INV-40).
- **Scenario:** Archive a member (`status=ARCHIVED`, `archived_at` set); attempt a hard DELETE of a member referenced by memberships.
- **Expected:** Archive succeeds and retains the row; DELETE blocked by FK RESTRICT from memberships.
- **Failure:** Member row deleted while referenced.
- **Recovery:** Restore from backup; replace delete paths with archive.

### INV-11 — archive only when no Active/Scheduled/Frozen membership AND zero balance
- **Purpose:** Safe archive guard (write-path).
- **Scenario:** Attempt to archive a member with (a) an Active membership, (b) a Scheduled membership, (c) a Frozen membership, (d) outstanding balance > 0; then with none of these.
- **Expected:** (a)(b)(c)(d) blocked by the write-path guard; clean case succeeds. (DB does not itself block — the test asserts the guard's outcome.)
- **Failure:** Archive succeeds despite an Active/Scheduled/Frozen membership or non-zero balance.
- **Recovery:** Re-open/repair wrongly-archived member; fix the guard; add regression test.

---

## D. Membership

### INV-12 — at most one Active and one Scheduled membership per member (P0)
- **Purpose:** Single current + single queued period.
- **Scenario:** Under concurrency, attempt to create two Active (or two Scheduled) memberships for one member in parallel `SERIALIZABLE` transactions; also verify a `cached_status` partial-unique was **not** added.
- **Expected:** Exactly one commits; the other aborts (serialization failure/guard); a legitimately-new membership after real expiry is **not** wrongly rejected.
- **Failure:** Two Active/Scheduled coexist, OR a valid new membership is rejected because a stale cache blocked it.
- **Recovery:** Cancel/correct the duplicate; ensure enforcement is the serializable write-path check (never a cache index).

### INV-13 — active periods never overlap for a member (P0)
- **Purpose:** No double-coverage.
- **Scenario:** Insert two non-cancelled memberships with overlapping `[start_date, original_end_date]`; then a freeze-extended overlap that the static dates don't show.
- **Expected:** Gross overlap **rejected** by the GiST exclusion `memberships_no_overlap_excl`; freeze/clock-relative overlap caught by the write-path.
- **Failure:** Overlapping active periods persist.
- **Recovery:** Cancel/adjust one period; verify exclusion constraint exists; fix write-path.

### INV-14 — membership captures plan terms at creation; immutable for the period
- **Purpose:** Snapshot immutability (P0).
- **Scenario:** Create a membership; change the source Plan's price/name/duration; attempt to UPDATE the membership's `snapshot_*`.
- **Expected:** Snapshot values are unchanged by the plan edit; snapshot columns are never updated (write-once policy; optional append-only trigger).
- **Failure:** Snapshot drifts with the plan or is edited.
- **Recovery:** Restore snapshot from audit/history; remove the offending update path.

### INV-15 — membership status alone controls access; payment standing never does
- **Purpose:** Access independent of money (P0).
- **Scenario:** Membership ACTIVE with outstanding balance > 0; recompute status.
- **Expected:** Status derives only from dates/cancel/freeze; balance is not an input.
- **Failure:** An unpaid balance flips status or gates access.
- **Recovery:** Remove payment inputs from status derivation; re-derive statuses.

### INV-16 — upgrade is deferred (Scheduled successor; no proration/refund)
- **Purpose:** Deferred-upgrade model.
- **Scenario:** Perform an upgrade; inspect rows.
- **Expected:** Current period unchanged; a new `origin=UPGRADE` SCHEDULED membership with `scheduled_effective_from = predecessor effective end + 1`; no proration/refund fields exist.
- **Failure:** Current period mutated, or a proration/refund row appears.
- **Recovery:** Reverse the mutation; recreate as Scheduled; remove proration logic.

### INV-17 — cancelled membership is terminal
- **Purpose:** No reactivation.
- **Scenario:** Set `cancelled_at`; attempt any further transition (activate/freeze/renew on the same row).
- **Expected:** All further transitions refused; renewal must be a **new** membership.
- **Failure:** A cancelled membership is reactivated/mutated.
- **Recovery:** Re-cancel; create a new membership for continued access.

### INV-18 — frozen days extend the end date exactly; no expiry while paused
- **Purpose:** Correct freeze math (T-4).
- **Scenario:** Freeze N days then resume; recompute `cached_effective_end_date`; check expiry during the freeze.
- **Expected:** Effective end = original end + Σ `frozen_days` (exactly N added); status not EXPIRED while a freeze is ACTIVE.
- **Failure:** End shifts by ≠ N, or membership expires while frozen.
- **Recovery:** Recompute caches from `membership_freezes`; fix the sweep.

### INV-19 — each period is append-only; renewal/upgrade create new rows
- **Purpose:** Period history (P0).
- **Scenario:** Renew a membership; inspect the predecessor.
- **Expected:** A new membership row with `predecessor_membership_id` set; predecessor untouched (closes at its end).
- **Failure:** Renewal overwrites the prior period.
- **Recovery:** Reconstruct prior period from audit; switch to append-only create.

---

## E. Payment & Money

### INV-20 — every payment belongs to exactly one membership (P0)
- **Purpose:** No orphan payments.
- **Scenario:** Insert a Payment with NULL `membership_id`.
- **Expected:** NOT NULL + FK reject it.
- **Failure:** An orphan payment persists.
- **Recovery:** Add NOT NULL; attribute or void orphan entries.

### INV-21 — payments immutable; correction only via recorded Void (P0)
- **Purpose:** Ledger immutability.
- **Scenario:** Attempt UPDATE/DELETE on a `payments` row; then void via a new `entry_type=VOID` row referencing the original; attempt to void the same payment twice.
- **Expected:** No UPDATE/DELETE path (optional trigger blocks at DB); void = appended row; second void rejected by `UNIQUE(voids_payment_id)`.
- **Failure:** A payment row is edited/deleted, or double-voided.
- **Recovery:** Restore from backup/audit; enforce append-only; add the unique.

### INV-22 — money is exact integer minor units + currency; never floats
- **Purpose:** Money correctness (P0).
- **Scenario:** Inspect `amount`/`price`/`snapshot_price` column types and currency columns.
- **Expected:** `BigInt` (minor units) + `Char(3)` currency; no float/double anywhere.
- **Failure:** A money column is float, or currency missing.
- **Recovery:** Migrate to integer minor units; backfill currency.

### INV-23 — amount due is captured price, immutable for the period
- **Purpose:** Stable obligation (M-4).
- **Scenario:** After creation, change the plan; attempt to alter `snapshot_price`.
- **Expected:** `snapshot_price` unchanged and never updated.
- **Failure:** Amount due drifts.
- **Recovery:** Restore snapshot; block updates.

### INV-24 — outstanding balance & standing are derived, never stored as truth
- **Purpose:** Derived money (H-5).
- **Scenario:** Recompute balance = `snapshot_price − Σ(non-voided PAYMENT amounts)` from the ledger; confirm no authoritative stored balance.
- **Expected:** Balance/standing computed from immutable rows; any cache is recomputable and labelled.
- **Failure:** A stored balance is treated as source of truth and diverges.
- **Recovery:** Drop/relabel the cache; recompute from ledger.

### INV-25 — revenue excludes voided & pending; reproducible per period (P0)
- **Purpose:** Correct revenue (M-6).
- **Scenario:** Record payments, void one, leave one membership unpaid; compute revenue for the period via `entry_type='PAYMENT'` by `received_at`, minus voided.
- **Expected:** Revenue = Σ non-voided received; excludes the void and the pending balance; same query reproduces a past period.
- **Failure:** Revenue includes voids/pending or is non-reproducible.
- **Recovery:** Fix the revenue query; recompute reports.

### INV-26 — plan price change affects only future memberships
- **Purpose:** Price isolation (PLN-3).
- **Scenario:** Change a plan's price; inspect existing memberships' `snapshot_price`.
- **Expected:** Existing amounts due unchanged; only new memberships use the new price.
- **Failure:** Past amounts due change with the plan.
- **Recovery:** Restore snapshots; ensure memberships snapshot at creation.

---

## F. Time

### INV-27 — timestamps stored UTC; business-day decisions in gym tz
- **Purpose:** Correct time semantics (T-1).
- **Scenario:** Inspect instant columns are `timestamptz`; verify "today"/expiry computed in `Gym.time_zone`.
- **Expected:** All instants `timestamptz` (UTC); judgments applied in gym tz at read.
- **Failure:** Naive timestamps, or business day judged in server tz.
- **Recovery:** Convert columns to `timestamptz`; route judgments through gym tz.

### INV-28 — end day inclusive; Expired begins the day after
- **Purpose:** Inclusive end (T-3).
- **Scenario:** Membership ending today; evaluate status today vs tomorrow (gym tz).
- **Expected:** ACTIVE through the end day; EXPIRED the next day; GiST range uses `'[]'`.
- **Failure:** Expires a day early/late.
- **Recovery:** Fix expiry boundary; re-sweep caches.

### INV-29 — time-derived states recomputed from immutable dates, not stored as truth
- **Purpose:** Derived status (H-5).
- **Scenario:** Compare `cached_status` to a fresh recompute from dates/freezes/clock.
- **Expected:** Cache equals recompute; cache is reconcilable and never authoritative.
- **Failure:** Cache diverges and is trusted as truth.
- **Recovery:** Run reconciliation sweep; treat cache as advisory.

### INV-30 — expiry/notification sweep is idempotent & non-duplicating
- **Purpose:** Safe sweeps (T-7).
- **Scenario:** Run the sweep twice over the same state.
- **Expected:** No duplicate notifications/state changes (backed by `UNIQUE(gym_id,dedupe_key)`).
- **Failure:** Second run creates duplicates.
- **Recovery:** Add/repair dedupe key; de-dup existing rows.

---

## G. Plan

### INV-31 — a sold plan is retired, never destroyed
- **Purpose:** Protect historical references (PLN-4).
- **Scenario:** Attempt to hard-delete a plan referenced by memberships; retire via `is_active=false`/`archived_at`.
- **Expected:** DELETE blocked by FK RESTRICT (`plans→memberships`); retire succeeds.
- **Failure:** A referenced plan is deleted.
- **Recovery:** Restore plan; replace delete with retire.

### INV-32 — inactive plans cannot be sold; existing memberships unaffected
- **Purpose:** Sellability control (PLN-2).
- **Scenario:** Set `is_active=false`; attempt to create a new membership from it; inspect existing memberships.
- **Expected:** Sale blocked (write-path on `is_active`); existing memberships unchanged.
- **Failure:** A new membership sells from an inactive plan.
- **Recovery:** Block the sale path; void the wrongly-sold membership.

---

## H. Notification

### INV-33 — notifications gym-scoped, in-app, non-duplicating
- **Purpose:** Clean alert queue (P0-ish for sweeps).
- **Scenario:** Generate the same expiry alert twice (same membership/type/window).
- **Expected:** Second insert rejected by `UNIQUE(gym_id,dedupe_key)`.
- **Failure:** Duplicate notifications appear.
- **Recovery:** Add the unique; de-dup; make the sweep idempotent.

### INV-34 — a dismissed notification is never resurrected
- **Purpose:** Forward-only state.
- **Scenario:** Dismiss a notification; run the sweep again for the same event.
- **Expected:** Dismissed row stays dismissed; a genuinely new qualifying event makes a **new** row (new dedupe window).
- **Failure:** A dismissed alert flips back to unread.
- **Recovery:** Fix state machine; restore DISMISSED state.

---

## I. Assignment

### INV-35 — trainer assignment belongs to one gym; informational only; ≤1 open
- **Purpose:** One current trainer (informational).
- **Scenario:** Open a second assignment for a member who already has an open one; confirm assignment is never used as a permission boundary.
- **Expected:** Second open rejected by partial unique `(member_id) WHERE unassigned_at IS NULL`; authz never reads assignments.
- **Failure:** Two open assignments, or assignment gates access.
- **Recovery:** Close the extra assignment; remove any authz dependence.

### INV-36 — no member points at a non-existent/removed trainer
- **Purpose:** No dangling trainer (write-path; trainers are soft-revoked).
- **Scenario:** Revoke a GymUser (trainer) who has open assignments.
- **Expected:** The revoke write-path reassigns/closes those open assignments in the same transaction (the FK does **not** fire on soft-revoke).
- **Failure:** A member retains an open assignment to a revoked trainer.
- **Recovery:** Close/reassign dangling assignments; add the revoke-path step + test.

---

## J. Ownership & History

### INV-37 — every entity has exactly one owning (writing) context
- **Purpose:** Single writer (data-ownership).
- **Scenario:** Review write paths per table against DDS §12 ownership map.
- **Expected:** Each table written by exactly one context; readers never write across boundaries.
- **Failure:** Two contexts write the same table.
- **Recovery:** Route writes through the owning module's public functions.

### INV-38 — Billing never writes Membership; Membership never writes Payment; Reporting writes nothing
- **Purpose:** Cross-context write ban.
- **Scenario:** Attempt a Membership write from Billing code (and vice-versa) in review/integration.
- **Expected:** Forbidden by module boundaries; FKs express references, not write rights.
- **Failure:** A cross-context mutation occurs.
- **Recovery:** Remove the cross-write; expose a query/action instead.

### INV-39 — immutable facts written once, never altered (P0)
- **Purpose:** Append-only history.
- **Scenario:** Attempt UPDATE/DELETE on `payments`, `audit_logs`, and membership snapshots.
- **Expected:** No mutation path; optional DB triggers deny UPDATE/DELETE on `payments`/`audit_logs`.
- **Failure:** An immutable fact is altered.
- **Recovery:** Restore from backup; install append-only triggers.

### INV-40 — history-bearing records soft-deleted, never hard-deleted
- **Purpose:** No destructive cascade.
- **Scenario:** Attempt to delete a Gym/Member/Membership/Payment with children; confirm all FKs are RESTRICT (only `role_permissions` cascades).
- **Expected:** Deletes blocked by RESTRICT; soft-delete flags used instead.
- **Failure:** A cascade destroys members/memberships/payments/audit.
- **Recovery:** Restore; change cascade→restrict; switch to soft-delete.

---

## K. Cross-cutting coverage map (per Task 6 "Cover" list)

| Theme | Invariants exercised |
|---|---|
| Relationships | INV-10/20/31/40 (FK RESTRICT/CASCADE), INV-36 |
| Constraints | INV-3/9/12/13/21/33/35 (uniques, partials, CHECK, exclusion) |
| Immutable History | INV-14/19/21/23/39 |
| Outstanding Balance | INV-24 (+ INV-15 access independence) |
| Scheduled Membership | INV-12/16/28 |
| Payment Ledger | INV-20/21/24/25 |
| Permission Model | INV-5/6/7/8 |
| Ownership | INV-37/38 |
| Time Rules | INV-27/28/29/30 |
| Money Rules | INV-22/23/24/25/26 |

**No invariant is left untested:** INV-1…40 each have ≥1 test above.

---

## L. Execution notes
- **P0 (blocking)** tests — tenancy (1/2), permission-without-role (5), one-active/one-scheduled + no-overlap (12/13), snapshot immutability (14/21/23), attribution (20), access≠payment (15), revenue-excludes-voids (25), history immutability (19/21/39) — must pass before any feature merges (testing-standards).
- DB-enforced tests run against a real Postgres (constraints can't be unit-mocked). Write-path tests run through the owning module's action inside a transaction.
- Every future bug fix adds a regression test here (testing-standards).
