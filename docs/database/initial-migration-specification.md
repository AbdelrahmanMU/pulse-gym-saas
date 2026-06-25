# Initial Database Migration — Specification
### PULSE Gym SaaS · The first migration (Prisma Migrate + hand-authored SQL)

| | |
|---|---|
| **Status** | ✅ Authoritative specification (not application code) |
| **Produces** | the single initial migration under `prisma/migrations/<ts>_init/migration.sql` |
| **Composition** | Prisma-Migrate-generated DDL (tables, FKs, enums, plain & composite indexes, simple uniques) **+** a hand-authored SQL tail for everything Prisma cannot express |
| **Honors** | DDS §3 (relationships), §4 (indexes), §13 (invariant→mechanism), §16 (implementation notes); database-standards (forward-only, reviewed) |
| **Engine** | PostgreSQL 18 (native `uuidv7()` available) |

> **How to read this.** Sections 2–11 list every construct the migration must contain and the **exact SQL** for the parts Prisma won't emit. Each row cites the DDS rule it satisfies. Nothing here introduces a business rule — it is the deterministic DB realization of the DDS.

---

## 1. Migration composition & authoring flow

1. `prisma migrate dev --name init` generates DDL from `schema.prisma`: all 17 tables, 11 enums, FKs with `ON DELETE` rules, plain/composite `@@index`, and the simple `@@unique` constraints.
2. **Append** the hand-authored SQL from §2, §5, §6, §7, §8 (extensions, CHECKs, partial uniques, GiST exclusion, trigram GIN, optional comments/defaults) to the **same** `migration.sql`, so the schema and its constraints land atomically in one reviewed migration.
3. Review, then `prisma migrate deploy` in each environment. Forward-only (database-standards); never edit a shipped migration.

> The hand-authored tail exists because Prisma cannot express **predicate-scoped uniqueness, exclusion constraints, CHECK constraints, extensions, or trigram indexes** (DDS §16). These are first-class DB design, not ORM convenience — they are authored explicitly.

---

## 2. Required PostgreSQL extensions  *(run first)*

| Extension | Purpose | DDS basis |
|---|---|---|
| `pg_trgm` | trigram GIN index for fast partial member search (name/phone/email) | §4, §16 |
| `btree_gist` | lets the GiST exclusion constraint combine `member_id` (equality) with a `daterange` (overlap) | §16, INV-13 |

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
```
*(Ordering: extensions must be created before the indexes/constraints that use them — §10.)*

---

## 3. Tables, enums, foreign keys  *(Prisma-generated — summarized)*

- **17 tables** (`gyms, branches, users, gym_users, roles, permissions, capabilities, role_permissions, members, member_notes, trainer_assignments, plans, memberships, membership_freezes, payments, notifications, audit_logs`), **11 enums** (DDS §1.8 + `GymUserStatus`).
- **PKs:** `uuid` (`@default(uuid(7))`); optional PG18 `DEFAULT uuidv7()` per identifier-strategy §2.
- **All FK columns are `uuid`** (type-matched to their target PK).

### 3.1 Foreign keys — delete/update rules (DDS §3)
**Policy:** explicit FKs everywhere; **`ON DELETE RESTRICT` is the default** (history/financials are soft-deleted/retired, never destroyed); **`ON DELETE CASCADE` only on `role_permissions`** (owned join rows). `ON UPDATE` is left default — PKs are immutable `uuid`, so updates never cascade in practice.

| FK group | On Delete | DDS |
|---|---|---|
| Every FK except `role_permissions.{role,permission}` | **RESTRICT** | §3 ("Restrict is the default") |
| `role_permissions.role_id`, `role_permissions.permission_id` | **CASCADE** | §3 ("Cascade only for owned join rows") |

**No cascade ever deletes a Member, Membership, Payment, or AuditLog (INV-40).** Soft-revoked trainers do **not** trigger the FK (INV-36 is write-path, §9).

---

## 4. Composite & plain indexes  *(Prisma-generated `@@index`/`@@unique` — verify present)*

Every index below is justified by a DDS §4/§5 query; `gym_id` leads tenant-scoped composites (INV-2). Prisma emits these from the schema — this list is the review checklist.

| Table | Index | DDS §4 query |
|---|---|---|
| users | `UNIQUE(email)` | sign-in by email |
| gym_users | `UNIQUE(gym_id,user_id)`; `INDEX(gym_id,status)` | authz hot path; active-staff list |
| roles | `UNIQUE(gym_id,key)` | role-by-key (gym-custom); + partial for platform (§5) |
| permissions | `UNIQUE(key)`; capabilities `UNIQUE(key)` | reference lookups |
| role_permissions | `UNIQUE(role_id,permission_id)`; `INDEX(role_id)` | resolve a role's permissions |
| members | `INDEX(gym_id,status)`, `(gym_id,branch_id)`, `(gym_id,full_name)` | active list; by branch; name sort |
| member_notes | `INDEX(member_id,created_at)` | member notes newest-first |
| plans | `INDEX(gym_id,is_active)` | sellable-plans dropdown |
| memberships | `INDEX(gym_id,member_id)`, `(member_id,cached_status)`, `(gym_id,cached_status,cached_effective_end_date)`, `(gym_id,source_plan_id)`, `(predecessor_membership_id)`, `(gym_id,created_at)` | profile; current; dashboard/sweep; plan-mix; chain; new-this-month |
| membership_freezes | `INDEX(gym_id,status)` | currently-frozen |
| payments | `UNIQUE(voids_payment_id)`; `INDEX(gym_id,membership_id)`, `(gym_id,received_at)`, `(gym_id,entry_type,received_at)` | voided-once; ledger; revenue; revenue-excl-voids |
| notifications | `UNIQUE(gym_id,dedupe_key)`; `INDEX(gym_id,state)`, `(gym_id,membership_id)` | dedup; unread queue; by-membership |
| audit_logs | `INDEX(gym_id,occurred_at)`, `(gym_id,target_type,target_id)`, `(gym_id,actor_user_id,occurred_at)` | feed; entity history; by-actor |

> `payments.UNIQUE(voids_payment_id)`: a standard unique on a nullable column — Postgres allows many NULLs, enforcing "voided at most once" for the non-NULL VOID rows (DDS §2.15).

---

## 5. Partial UNIQUE indexes & partial indexes  *(hand-authored — Prisma can't express `WHERE`)*

| # | Construct | DDS basis |
|---|---|---|
| P-1 | platform-role key uniqueness | §4 ("gym_id-null treated as global") |
| P-2/3 | member identifying contact unique **per gym, non-archived** | INV-3, §13 (resolves MBR-3↔MBR-5) |
| P-4 | one **open** trainer assignment per member | INV-35 |
| P-5 | a trainer's current-assignees accelerator | §4 |
| P-6 | one **active** freeze per membership | §2.14, FRZ |

```sql
-- P-1  Platform roles (gym_id IS NULL) must have unique keys; the composite
--      UNIQUE(gym_id,key) does NOT cover this (NULLs are distinct).  DDS §4
CREATE UNIQUE INDEX roles_platform_key_key
  ON roles (key) WHERE gym_id IS NULL;

-- P-2/P-3  INV-3: contact unique within a gym, among NON-archived members only,
--          so a recycled phone/email is reusable after the prior holder archives.
CREATE UNIQUE INDEX members_gym_phone_active_key
  ON members (gym_id, phone) WHERE phone IS NOT NULL AND archived_at IS NULL;
CREATE UNIQUE INDEX members_gym_email_active_key
  ON members (gym_id, email) WHERE email IS NOT NULL AND archived_at IS NULL;

-- P-4  INV-35: at most one open (current) trainer assignment per member.
CREATE UNIQUE INDEX trainer_assignments_one_open_per_member_key
  ON trainer_assignments (member_id) WHERE unassigned_at IS NULL;

-- P-5  §4: a trainer's current assignees (accelerator), open rows only.
CREATE INDEX trainer_assignments_trainer_open_idx
  ON trainer_assignments (trainer_gym_user_id) WHERE unassigned_at IS NULL;

-- P-6  §2.14/FRZ: at most one ACTIVE freeze per membership.
CREATE UNIQUE INDEX membership_freezes_one_active_per_membership_key
  ON membership_freezes (membership_id) WHERE status = 'ACTIVE';
```

---

## 6. GiST exclusion constraint — non-overlap backstop (INV-13)

A **static** backstop on immutable dates only; the write-path transaction remains authoritative for freeze-extended/clock-relative overlap (DDS §2.13/§16). Requires `btree_gist` (§2).

```sql
-- INV-13 / T-5: active membership periods never overlap for the same member.
ALTER TABLE memberships
  ADD CONSTRAINT memberships_no_overlap_excl
  EXCLUDE USING gist (
    member_id WITH =,
    daterange(start_date, original_end_date, '[]') WITH &&
  ) WHERE (cancelled_at IS NULL);
```
> Inclusive end day (`'[]'`) honors T-3. Cancelled periods are excluded from the constraint (a cancelled period frees the range).

---

## 7. CHECK constraints  *(hand-authored — single-row invariants)*

| # | Table | CHECK | DDS basis |
|---|---|---|---|
| C-1 | members | `phone IS NOT NULL OR email IS NOT NULL` | MBR-2 / INV-9 |
| C-2 | payments | `amount > 0` | §2.15 (positive magnitude; effect by `entry_type`) |
| C-3 | plans | `price >= 0 AND duration_value > 0` | §2.12 |
| C-4 | gyms | `expiring_soon_window_days >= 0 AND grace_period_days >= 0` | §2.1 |
| C-5 | membership_freezes | `frozen_days >= 0` | §2.14 |

```sql
ALTER TABLE members            ADD CONSTRAINT members_contact_present_chk
  CHECK (phone IS NOT NULL OR email IS NOT NULL);
ALTER TABLE payments           ADD CONSTRAINT payments_amount_positive_chk
  CHECK (amount > 0);
ALTER TABLE plans              ADD CONSTRAINT plans_price_duration_chk
  CHECK (price >= 0 AND duration_value > 0);
ALTER TABLE gyms               ADD CONSTRAINT gyms_windows_nonneg_chk
  CHECK (expiring_soon_window_days >= 0 AND grace_period_days >= 0);
ALTER TABLE membership_freezes ADD CONSTRAINT freezes_frozen_days_nonneg_chk
  CHECK (frozen_days >= 0);
```

> **Not CHECKs (do not attempt):** `Payment.currency = membership snapshot currency` is **cross-table** → write-path. `entry_type=VOID ⇒ voids_payment_id NOT NULL` could be a CHECK, but the DDS models void linkage as a write-path + `UNIQUE(voids_payment_id)` concern; an optional belt-and-braces CHECK `(entry_type <> 'VOID' OR voids_payment_id IS NOT NULL)` may be added — **flagged, not mandated** (keep VOID semantics in the write path per §2.15).

---

## 8. GIN trigram search index (fast partial member search)

```sql
-- §4/§16: front-desk partial search by name (primary) — and optionally contact.
CREATE INDEX members_full_name_trgm_idx
  ON members USING gin (full_name gin_trgm_ops);
-- Optional (add when search broadens — §4 "future index candidates"):
-- CREATE INDEX members_phone_trgm_idx ON members USING gin (phone gin_trgm_ops);
-- CREATE INDEX members_email_trgm_idx ON members USING gin (email gin_trgm_ops);
```

---

## 8a. Generated columns — none (by design)

No `GENERATED ALWAYS AS (…) STORED` column is appropriate. A Postgres stored generated column must be a **deterministic expression over same-row columns only**. Every derived value in this model fails that test:
- `cached_status`, `cached_is_expiring_soon`, `cached_effective_end_date` depend on the **gym clock** (time-relative) and on **other rows** (`membership_freezes` aggregation) — not same-row, not deterministic. They are **sweep-maintained labelled caches** (DDS §1.6), never authoritative.
- Outstanding balance / payment standing aggregate the **Payment ledger** (cross-row) — derived on read (DDS §8), optionally a labelled cache (perf-review R-2), never a generated column.
- `cached_effective_end_date = original_end_date + Σ frozen_days` is cross-row (freezes), so not same-row-deterministic.

**Decision:** zero generated columns; derived values follow the DDS §1.6 "derived, never stored as truth; recomputable cache where justified" discipline.

---

## 9. Write-path-enforced invariants — NOT in this migration (by design)

The migration deliberately does **not** attempt these; they are application logic inside a `SERIALIZABLE` transaction (DDS §2.13/§16). Listed so reviewers don't mistake their absence for a gap:

| Invariant | Why not a DB constraint |
|---|---|
| **INV-12** ≤1 ACTIVE + ≤1 SCHEDULED per member | Status is time-relative (gym clock); a `cached_status` partial-unique would lag and reject valid inserts. Enforced by re-checking immutable facts in a serializable tx. |
| **INV-13** freeze-extended/clock-relative overlap | The GiST backstop (§6) covers only immutable dates; effective-end shifts with freezes. |
| **INV-36** no dangling trainer | Trainers are **soft-revoked** → the FK never fires; the revoke write-path must reassign/close open assignments. |
| **INV-11** archive guard | Cross-aggregate check (no Active/Scheduled membership + zero balance) before `status=ARCHIVED`. |
| **Payment.currency = snapshot currency** | Cross-table comparison. |

> Optional defense-in-depth (DDS §16): DB triggers/role grants denying `UPDATE`/`DELETE` on `payments` and `audit_logs` to enforce append-only at the engine. Recommended for production; can be a follow-up migration.

---

## 10. Migration ordering

1. **Extensions** (`pg_trgm`, `btree_gist`) — before any dependent index/constraint.
2. **Enums** (Prisma).
3. **Tables** + columns + PK defaults (Prisma; optional `uuidv7()` defaults).
4. **Foreign keys** + `ON DELETE` rules (Prisma).
5. **Plain/composite indexes** + simple uniques (Prisma).
6. **Partial uniques & partial indexes** (§5).
7. **GiST exclusion** (§6) — needs `btree_gist` (1) and the table (3).
8. **CHECK constraints** (§7).
9. **GIN trigram** (§8) — needs `pg_trgm` (1).
10. *(Optional)* COMMENTs (§11) and append-only triggers (§9).

Prisma emits 2–5 in dependency order; the hand-authored tail (6–10) is appended after.

---

## 11. Database comments  *(optional, recommended for the non-obvious)*

`COMMENT ON` is cheap living documentation for constructs whose intent isn't obvious from the name — especially the write-path carve-outs, so a DBA reading the schema doesn't "helpfully" add the missing constraint.

```sql
COMMENT ON COLUMN memberships.cached_status IS
  'DERIVED cache (DDS §1.6). NOT authoritative; do NOT add a partial-unique on it for INV-12.';
COMMENT ON CONSTRAINT memberships_no_overlap_excl ON memberships IS
  'INV-13 static backstop on immutable dates; write-path is authoritative for freeze/clock cases.';
COMMENT ON COLUMN payments.amount IS
  'MoneyMinorUnits, positive magnitude; effect determined by entry_type (PAYMENT/VOID). Append-only.';
COMMENT ON TABLE audit_logs IS 'Append-only, write-once (INV-39). No UPDATE/DELETE.';
```
*(Comments are optional; include the four above at minimum.)*

---

## 12. Rollback considerations
- **Greenfield, single migration:** the practical rollback is **drop schema / drop database** and re-apply — there is no prior state to preserve. `prisma migrate` is **forward-only**; we do not author `down` SQL (database-standards).
- For a partially-failed apply, wrap the hand-authored tail so the migration is **all-or-nothing** (Prisma runs a migration in a transaction where possible; note that `CREATE INDEX CONCURRENTLY` cannot run in a transaction — we use plain `CREATE INDEX` here since the tables are empty at init, so locking is a non-issue).
- Post-data destructive changes later require explicit human approval + a backout plan (database-standards §migrations); not applicable to this first migration.

## 13. Fresh-install compatibility
- A clean PostgreSQL 18 database + this single migration yields the complete schema, all constraints, and indexes. No ordering hazard (extensions first). Empty tables mean no index-build or constraint-validation cost.
- The **seed** (separate step) loads permissions, capabilities, system roles (Owner/Trainer assignable; dormant roles `is_assignable=false`), RolePermission mappings, one Gym + default Branch + Owner GymUser, **and a reserved `system-actor` User** (global, non-login; the `created_by`/`recorded_by` attribution for system-originated writes — keeps `Membership.created_by`/`Payment.recorded_by` NOT NULL; DDS §16 seed list). Seed ids are UUID v7. *The system-actor User has an unusable password hash and `is_active=false`; it is never assignable as staff and never authenticates.*

## 14. Upgrade-path compatibility
- All future changes are **additive, forward-only** migrations (DDS §15, database-standards): new `Payment` entry types (`REFUND/CREDIT/DISCOUNT`), `GymUserRole` for multi-role, effective-dated plan versions, `Attendance`, per-branch tz, the YAGNI-deferred columns (`branding`, `business_hours`, `branch_id` on staff, invitation timestamps) — each re-introduced as a nullable additive column when its feature ships.
- **Never** rename a permission key (INV-7) or mutate a shipped migration. Partitioning of `payments`/`audit_logs`/`memberships` (by `gym_id`/time) at Large/Enterprise volume is a future migration (DDS §7/§14).
- Re-introducing a deferred column is a one-line additive migration — exactly the "activate without migration-risk" posture the DDS §14 intends (the *architecture* needs no redesign; only the column returns).

---

*This specification is the single source of truth for the initial migration's contents. Implementation copies this SQL into the generated `migration.sql`; it does not re-decide anything here.*
