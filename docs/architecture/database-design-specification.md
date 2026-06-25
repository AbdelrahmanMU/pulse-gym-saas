# Database Design Specification (DDS)
### PULSE Gym SaaS · The canonical, technology-agnostic database design

| | |
|---|---|
| **Status** | ✅ Authoritative — the single source of truth for the data model |
| **Technology stance** | **ORM-agnostic.** Generating Prisma/Drizzle/EF Core/SQL from this is a *translation*, not a *design* activity. ORM/engine specifics appear **only** in §16 Implementation Notes. |
| **Honors** | PRD, ADR, `business-rules.md`, `business-invariants.md`, `data-ownership.md`, `module-communication.md`, `authorization-architecture.md`, `money-rules.md`, `time-rules.md`, `immutable-history.md`, `database-standards.md` |
| **Rule** | This DDS **never contradicts** prior governance. Where a rule lives elsewhere, it is **cited**, not redefined. |

> **How to read attribute tables.** Type names are abstract (mapped to engine types in §16). **Req** = required (NOT NULL). **Mut** = mutability: `I` immutable/write-once, `M` mutable operational, `D` derived (not a stored source of truth; may exist as a clearly-labelled cache). Every business entity is tenant-scoped by `gym_id` and carries audit timestamps unless stated.

---

## 1. Global Conventions (apply to every entity)

### 1.1 Identifiers
- **Primary key:** a single surrogate `id`, type **Identifier** (non-sequential, globally unique — **UUID v7**; see §16 and `/docs/database/identifier-strategy.md`). Opaque; never encodes meaning (database-standards, INV: non-guessable IDs).
- **No composite primary keys** for entities (join tables may use a unique composite constraint over their FKs but still carry a surrogate `id` for ORM ergonomics — see §16).

### 1.2 Tenancy columns
- **`gym_id` (Reference→Gym, Req, I)** on **every business entity** (INV-1). Global reference tables (Permission, Capability, system Role) are the only exceptions.
- **`branch_id` (Reference→Branch, optional, M)** on business entities that occur at a location (Member, Membership, Payment, AuditLog). Present from day one; defaulted to the gym's single branch in MVP (BRN-1, database-standards). Never a substitute for `gym_id` (INV-2).
- **Scope rule:** every read/write is filtered by `gym_id` from the session (INV-2); cross-gym access is impossible.

### 1.3 Audit columns
- **`created_at` (Timestamp-UTC, Req, I)** — set once at creation.
- **`updated_at` (Timestamp-UTC, M)** — present only on entities with mutable operational fields; **absent on append-only/immutable ledgers** (Payment, AuditLog, and each Membership *snapshot*; Membership still has `updated_at` for its operational fields — see entity).
- **`created_by` / `updated_by` (Reference→User, optional)** — recorded where accountability matters (memberships, payments, notes, assignments, role grants).
- All timestamps are **stored in UTC** (time-rules T-1).

### 1.4 Money
- Monetary amounts are **Integer minor units** (`MoneyMinorUnits`) — never floats (money-rules M-1, ADR-009).
- Every monetary amount is paired with a **`CurrencyCode`** (ISO-4217, 3 chars). A gym's default currency lives on Gym; captured amounts also store their currency for immutability (money-rules §1).

### 1.5 Time
- Dates that are business-day concepts (membership start/end) are **Date** (no time-of-day); instants are **Timestamp-UTC**. Business-day judgments use the **gym time zone** at read (time-rules T-1/T-2). Inclusive end day (T-3).

### 1.6 Derived vs stored (critical — immutable-history H-5)
- **Derived values are never stored as the source of truth:** membership lifecycle status, `is_expiring_soon`, `effective_end_date`, payment standing, outstanding balance, revenue, unread counts (INV-24/29, M-5, T-6).
- Where performance demands it, a **labelled cache column** may hold a derived value (e.g., `cached_status`), maintained by the daily sweep/triggers and **always recomputable** from immutable facts. A cache is never authoritative; reconciliation recomputes it.

### 1.7 Soft delete & archive
- Entities with history/financial meaning are **soft-deleted/archived, never hard-deleted** (INV-40): represented by a nullable `archived_at`/`deleted_at` (and a status where the domain names one). Default queries exclude archived rows.
- Truly transient rows (e.g., sessions) may hard-delete (out of DDS scope).

### 1.8 Enumerations (controlled vocabularies)
Stored as constrained string enums (readable in DB & code). Defined once here; never invent values outside the domain.

| Enum | Values | Source |
|---|---|---|
| `DurationUnit` | `DAY`, `WEEK`, `MONTH` | Plan duration |
| `MembershipOrigin` | `NEW`, `RENEWAL`, `UPGRADE`, `DOWNGRADE` | MSH-7, UPG, REN |
| `MembershipStatus` *(derived)* | `SCHEDULED`, `ACTIVE`, `FROZEN`, `EXPIRED`, `CANCELLED` (+ derived flag `EXPIRING_SOON` over ACTIVE) | state-machines |
| `FreezeStatus` | `ACTIVE`, `ENDED` | FRZ |
| `PaymentEntryType` | `PAYMENT`, `VOID` (future: `REFUND`, `CREDIT`, `DISCOUNT`) | money-rules |
| `PaymentMethod` | `CASH`, `BANK_TRANSFER`, `CARD_MANUAL`, `OTHER` | PAY-1 |
| `PaymentStanding` *(derived)* | `PENDING`, `PARTIALLY_PAID`, `PAID` | PAY-3 |
| `MemberStatus` | `ACTIVE`, `ARCHIVED` | ARC |
| `NotificationType` | `MEMBERSHIP_EXPIRING_SOON`, `MEMBERSHIP_EXPIRED` (future: `PAYMENT_DUE`, `ONBOARDING`) | NTF-2 |
| `NotificationState` | `UNREAD`, `READ`, `DISMISSED` | NTF-4 |

---

## 2. Entity Specifications

> 16 entities across 7 owning contexts (`data-ownership.md`). Each entity below is owned (written) by exactly one context (INV-37).

### 2.1 Gym  *(Owning Context: IAM / Tenant & Identity)*
- **Purpose** — The business tenant; root of ownership and isolation.
- **Business Responsibility** — Hold gym-wide settings; guarantee isolation (GYM-1…4).
- **Relationships / Cardinality** — 1→many: Branches, GymUsers, Members, Plans, Memberships, Payments, Notifications, AuditLogs, (gym-custom Roles future).
- **Required Attributes**

  | Attr | Type | Req | Mut | Notes |
  |---|---|---|---|---|
  | id | Identifier | ✓ | I | PK |
  | name | ShortText | ✓ | M | |
  | default_currency | CurrencyCode | ✓ | M | money-rules §1 |
  | time_zone | ShortText (IANA tz) | ✓ | M | time-rules T-1 |
  | expiring_soon_window_days | Integer | ✓ | M | default 7 (MSH-4) |
  | created_at | Timestamp-UTC | ✓ | I | |
  | updated_at | Timestamp-UTC | ✓ | M | |
- **Optional Attributes** — `contact_email`, `contact_phone`, `grace_period_days` (Integer, default 0 — time-rules §11), `archived_at`. *(MVP-only reconciliation, 2026-06-25: `branding` and `business_hours` removed from the live schema and deferred to Future Expansion — no MVP consumer; business-rules **GYM-2** lists per-gym branding/business-hours as future, and MVP theming is token-based via the `--brand-*` seam. See `/docs/database/database-architecture-review.md`.)*
- **Business Constraints** — `expiring_soon_window_days` ≥ 0; `grace_period_days` ≥ 0; `default_currency` valid ISO-4217.
- **Business Invariants** — INV-1/2 (root of tenancy).
- **Lifecycle** — Created at onboarding → operating → (future) suspended/closed (`archived_at`).
- **Soft Delete** — Soft via `archived_at`; never hard-deleted (cascades would destroy a business).
- **Archive / Audit / History** — Settings changes audited (AuditLog `gym.settings_updated`); name/settings are mutable present-state (not history).
- **Future Expansion** — SaaS subscription/billing fields, plan-limits, franchise grouping, per-gym feature flags, **per-gym `branding` and `business_hours`/locale** (GYM-2 — deferred from MVP).

### 2.2 Branch  *(Owning Context: IAM)*
- **Purpose** — A physical location within a gym (BRN-1).
- **Business Responsibility** — Localize members/memberships/payments.
- **Relationships / Cardinality** — many→1 Gym; 1→many Members/Memberships/Payments (by `branch_id`).
- **Required Attributes** — `id`, `gym_id`, `name` (ShortText, M), `created_at`, `updated_at`.
- **Optional Attributes** — `address` (JSON/Text), `contact_phone`, `is_active` (Boolean, default true), `archived_at`. *(MVP-only reconciliation, 2026-06-25: per-branch `time_zone` removed from the live schema and deferred to Future Expansion — GYM-2 makes time zone a gym-wide setting in MVP.)*
- **Business Constraints** — Always within one gym (BRN-2); a default branch is seeded per gym.
- **Business Invariants** — INV-1.
- **Lifecycle** — Created (default at gym setup) → operating → closed (`archived_at`).
- **Soft Delete / Archive** — Soft via `archived_at`/`is_active`; never hard-deleted while referenced.
- **Audit / History** — Branch changes audited; details are present-state.
- **Future Expansion** — Multi-branch management, transfers, per-branch staffing & reporting, per-branch tz.

### 2.3 User  *(Owning Context: IAM)*  — **global identity (not tenant-scoped)**
- **Purpose** — An authenticatable staff identity (Owner/Trainer), possibly across gyms.
- **Business Responsibility** — Represent a human who signs in; distinct from Member (glossary).
- **Relationships / Cardinality** — 1→many GymUser (one per gym they belong to); referenced by `created_by`/`updated_by` audit fields.
- **Required Attributes**

  | Attr | Type | Req | Mut | Notes |
  |---|---|---|---|---|
  | id | Identifier | ✓ | I | |
  | email | ShortText | ✓ | M | global login identity; unique (see §4) |
  | display_name | ShortText | ✓ | M | |
  | password_hash | Text | ✓ | M | hashed only (security-guidelines); **never** plaintext |
  | created_at / updated_at | Timestamp-UTC | ✓ | I/M | |
- **Optional Attributes** — `phone`, `avatar_url`, `last_login_at`, `is_active` (Boolean, default true), `deactivated_at`.
- **Business Constraints** — `email` globally unique (it is the cross-gym login). No `gym_id` (global).
- **Business Invariants** — INV-4 (acts only within gyms via GymUser).
- **Lifecycle** — Invited/created → active → deactivated.
- **Soft Delete** — Soft via `is_active`/`deactivated_at`; preserve for audit references.
- **Audit / History** — Sign-in events → AuditLog (`auth.login`); credential changes audited (never logged in clear).
- **Future Expansion** — MFA secrets, SSO identity links, profile, notification preferences, multi-gym context selection.

### 2.4 GymUser  *(Owning Context: IAM)*  — the staff-membership link
- **Purpose** — Make a User part of a specific Gym with a role; the **multi-gym enabler** (domain-model).
- **Business Responsibility** — Grant & scope staff access (one user, many gyms).
- **Relationships / Cardinality** — many→1 User; many→1 Gym; many→1 Role. Referenced by TrainerAssignment (trainer side).
- **Required Attributes**

  | Attr | Type | Req | Mut | Notes |
  |---|---|---|---|---|
  | id | Identifier | ✓ | I | |
  | gym_id | Reference→Gym | ✓ | I | |
  | user_id | Reference→User | ✓ | I | |
  | role_id | Reference→Role | ✓ | M | one role per GymUser in MVP (future: many via GymUserRole) |
  | status | Enum(`ACTIVE`,`REVOKED`) | ✓ | M | revoking ends access |
  | created_at / updated_at | Timestamp-UTC | ✓ | I/M | |
  | created_by | Reference→User | – | I | who granted access |
- **Optional Attributes** — `revoked_at`. *(MVP-only reconciliation, 2026-06-25: `branch_id`, `invited_at`, `accepted_at` removed from the live schema and deferred to Future Expansion — branch-scoped staff is future per authorization-architecture **A1**; the invitation workflow is future per domain-model. `revoked_at` is kept: it pairs with `status=REVOKED` soft-revoke, used in MVP.)*
- **Business Constraints** — **Unique `(gym_id, user_id)`** — one staff membership per user per gym. Effective permissions = permissions of `role_id` (authz §1).
- **Business Invariants** — INV-4/INV-5/INV-8 (tenancy + permission resolution).
- **Lifecycle** — Granted → active → revoked.
- **Soft Delete** — Soft via `status=REVOKED`/`revoked_at`; never hard-deleted (audit references).
- **Audit / History** — Grant/revoke/role-change audited (`staff.role_granted`, etc.).
- **Future Expansion** — Many-to-many `GymUserRole`; branch-scoped assignment; invitation workflow status.

### 2.5 Role  *(Owning Context: IAM)*  — **a named bundle of permissions (no behavior)**
- **Purpose** — Group permissions for assignment (authz §2). **Carries no logic.**
- **Business Responsibility** — Map a name → a permission set; support dormant/future roles.
- **Relationships / Cardinality** — 1→many GymUser; many↔many Permission via RolePermission.
- **Required Attributes**

  | Attr | Type | Req | Mut | Notes |
  |---|---|---|---|---|
  | id | Identifier | ✓ | I | |
  | key | ShortText | ✓ | I | stable identifier e.g. `owner`,`trainer`,`front_desk` |
  | name | ShortText | ✓ | M | human label |
  | is_system | Boolean | ✓ | I | true for platform-defined (Owner/Trainer/dormant) |
  | is_assignable | Boolean | ✓ | M | **false = dormant** (Front Desk et al.) — seeded unassignable |
  | gym_id | Reference→Gym | – | I | **null = platform role**; non-null = future gym-custom |
  | created_at / updated_at | Timestamp-UTC | ✓ | I/M | |
- **Business Constraints** — `key` unique within scope (`gym_id` null = global unique; per-gym unique when custom). Dormant roles have `is_assignable=false` (security R4: seeded unassignable).
- **Business Invariants** — INV-5/INV-6/INV-7 (role = permission set; no role-name logic anywhere).
- **Lifecycle** — Seeded (system) → dormant ⇄ assignable; gym-custom (future) created/edited via `roles.manage`.
- **Soft Delete** — System roles never deleted; dormant ones remain. Custom roles (future) soft-deleted if unused.
- **Audit / History** — Role↔permission mapping changes audited.
- **Future Expansion** — Gym-custom roles (`gym_id` non-null), branch-scoped roles, role descriptions/icons.

### 2.6 Permission  *(Owning Context: IAM)*  — **global reference data**
- **Purpose** — A stable named right to perform an action (authz §4).
- **Relationships / Cardinality** — many→1 Capability; many↔many Role via RolePermission.
- **Required Attributes** — `id`, `key` (ShortText, I — e.g. `payments.record`; **immutable forever**, INV-7), `capability_id` (Reference→Capability, I), `description` (ShortText, M — label may change), `created_at`.
- **Business Constraints** — `key` globally unique and **never renamed** (INV-7). No `gym_id` (global). No `updated_at` for the key (only `description` mutable).
- **Business Invariants** — INV-7 (immutable keys; deny by default).
- **Lifecycle** — Seeded; **append-only** (new permissions added, never removed/renamed).
- **History / Future** — Adding permissions is additive; future keys per money-rules/attendance/etc.

### 2.7 Capability  *(Owning Context: IAM)*  — **global reference data**
- **Purpose** — A named business grouping that **owns** permissions (authz §3, §13).
- **Relationships / Cardinality** — 1→many Permission.
- **Required Attributes** — `id`, `key` (ShortText, I — e.g. `payment_management`), `name` (ShortText, M), `responsible_context` (ShortText, I — e.g. `Billing`), `created_at`.
- **Business Constraints** — `key` unique; each capability has exactly one responsible context (authz §13).
- **Future** — New capabilities for future modules (Attendance, Billing-online).

### 2.8 RolePermission  *(Owning Context: IAM)*  — join (Role ↔ Permission)
- **Purpose** — The data mapping that *is* a role's access (authz §9).
- **Relationships / Cardinality** — many→1 Role; many→1 Permission.
- **Required Attributes** — `id`, `role_id` (Reference→Role, I), `permission_id` (Reference→Permission, I), `created_at`.
- **Business Constraints** — **Unique `(role_id, permission_id)`**. Granting/revoking a permission to a role is a row insert/delete (data, never code).
- **Invariants** — INV-5/6 (authorization is data-driven).
- **Future** — Effective-permission resolution may be cached (read model §6).

### 2.9 Member  *(Owning Context: Member Management)*
- **Purpose** — A customer of the gym (MBR-1).
- **Business Responsibility** — Identity + relationship to the gym over time.
- **Relationships / Cardinality** — many→1 Gym, many→1 Branch (home); 1→many MemberNote; 1→many Membership; 1→many Payment (via membership); 1→many TrainerAssignment; current trainer = the open assignment.
- **Required Attributes**

  | Attr | Type | Req | Mut | Notes |
  |---|---|---|---|---|
  | id | Identifier | ✓ | I | |
  | gym_id | Reference→Gym | ✓ | I | |
  | branch_id | Reference→Branch | ✓ | M | home branch |
  | full_name | ShortText | ✓ | M | MBR-2 |
  | status | Enum(`MemberStatus`) | ✓ | M | ACTIVE/ARCHIVED |
  | created_at / updated_at | Timestamp-UTC | ✓ | I/M | |
- **Contact (at least one required — MBR-2):** `phone` (ShortText, M, optional col), `email` (ShortText, M, optional col) — **constraint: phone OR email present**.
- **Optional Attributes** — `date_of_birth` (Date), `gender` (ShortText), `notes_summary`, `joined_on` (Date), `archived_at`, `created_by`.
- **Business Constraints** — **Unique identifying contact among *non-archived* members within a gym** — partial-unique `(gym_id, phone) WHERE phone IS NOT NULL AND archived_at IS NULL` and `(gym_id, email) WHERE email IS NOT NULL AND archived_at IS NULL` (MBR-3, INV-3). **Decision (resolves the MBR-3 ↔ MBR-5 tension):** uniqueness is scoped to **active** members only, so a recycled phone/email can be reused for a genuinely new member after the prior holder is archived; the **"reactivate, don't recreate"** guard is a **write-path** behavior (registration searches archived members by contact and offers reactivation — workflow 1), **not** a permanent hard constraint that would forever block a recycled number. At least one contact present (CHECK: `phone IS NOT NULL OR email IS NOT NULL`).
- **Business Invariants** — INV-3/9/10/11.
- **Lifecycle** — Registered → Active ⇄ Archived (ARC). 
- **Soft Delete / Archive** — **Archived, never erased** (MBR-5/INV-10) via `status=ARCHIVED`+`archived_at`; archive allowed **only** when no Active/Scheduled membership and zero outstanding balance (ARC-3/INV-11 — enforced in the Member-Management write path, which *asks* Membership/Billing).
- **Audit / History** — Create/update/archive/reactivate audited; profile fields are present-state (mutable).
- **Future Expansion** — Self-service portal account link, photo, household/family links, marketing consent, custom fields.

### 2.10 MemberNote  *(Owning Context: Member Management)*
- **Purpose** — Qualitative note about a member.
- **Relationships / Cardinality** — many→1 Member (and Gym); authored by a User.
- **Required Attributes** — `id`, `gym_id`, `member_id` (Reference→Member, I), `body` (Text, M), `author_user_id` (Reference→User, I), `created_at`, `updated_at`.
- **Optional Attributes** — `category` (ShortText), `archived_at`.
- **Business Constraints** — Always tied to a member; visible per gym (TRN-2 read/write).
- **Invariants** — INV-1.
- **Lifecycle** — Created → (edited per `notes.update`) → retained with member.
- **Soft Delete** — Soft via `archived_at`; tied to member retention rules.
- **Future** — Note types (medical/goals), attachments, visibility levels.

### 2.11 TrainerAssignment  *(Owning Context: Member Management)*  — append-only relationship history
- **Purpose** — Record which trainer coaches a member, over time (domain OQ-M1 resolved as relationship).
- **Business Responsibility** — Current assignment + history; **informational only** (ASN-2, never a permission boundary).
- **Relationships / Cardinality** — many→1 Member; many→1 GymUser (trainer side). **At most one open** assignment per member.
- **Required Attributes** — `id`, `gym_id`, `member_id` (I), `trainer_gym_user_id` (Reference→GymUser, I), `assigned_at` (Timestamp-UTC, I), `assigned_by` (Reference→User, I), `unassigned_at` (Timestamp-UTC, M, nullable).
- **Business Constraints** — **At most one row per member with `unassigned_at IS NULL`** (the current trainer) — partial-unique (§4). Trainer must be a current GymUser of the same gym. **No dangling trainer (INV-36):** because trainers are *soft-revoked* (the FK never fires), revoking a GymUser must, **in the same write path**, reassign or close (`unassigned_at`) that trainer's open assignments — this is the authoritative enforcement, not the FK. One trainer per member in MVP (TRN-3).
- **Business Invariants** — INV-35/36.
- **Lifecycle** — Assigned (open) → unassigned (closed); reassign = close old + open new (append-only).
- **History Policy** — **Append-only**; never edited/deleted (closing sets `unassigned_at`).
- **Future** — Multiple trainers/specialities (drop the single-open constraint), assignment reasons.

### 2.12 Plan  *(Owning Context: Plan Catalog)*
- **Purpose** — A sellable offering (PLN-1).
- **Relationships / Cardinality** — many→1 Gym; 1→many Membership (as source, via snapshot — never a live dependency on price).
- **Required Attributes**

  | Attr | Type | Req | Mut | Notes |
  |---|---|---|---|---|
  | id | Identifier | ✓ | I | |
  | gym_id | Reference→Gym | ✓ | I | |
  | name | ShortText | ✓ | M | |
  | price | MoneyMinorUnits | ✓ | M | **future** memberships only (PLN-3) |
  | currency | CurrencyCode | ✓ | M | usually gym default |
  | duration_value | Integer | ✓ | M | > 0 |
  | duration_unit | Enum(`DurationUnit`) | ✓ | M | |
  | is_active | Boolean | ✓ | M | sellable flag (PLN-2) |
  | created_at / updated_at | Timestamp-UTC | ✓ | I/M | |
- **Optional Attributes** — `description` (Text), `tier` (ShortText — data-viz tier, not status), `archived_at`, `created_by`.
- **Business Constraints** — `price` ≥ 0; `duration_value` > 0. **Editing price/duration affects only future memberships** (PLN-3/INV-26) — enforced because memberships snapshot terms. Inactive plans not sellable (PLN-2/INV-32).
- **Business Invariants** — INV-26/31/32.
- **Lifecycle** — Created → Active ⇄ Inactive (retire). **Retired, never destroyed once sold** (PLN-4/INV-31).
- **Soft Delete** — Soft via `is_active`/`archived_at`; **restrict hard-delete** if any membership references it (FK restrict).
- **History Policy** — Plan rows are present-state (price/duration mutate for future sales); historical truth lives in membership snapshots, not here.
- **Future** — Tiers, add-ons, promotions, scheduled price changes (effective-dated plan versions), class packs, family plans.

### 2.13 Membership  *(Owning Context: Membership Lifecycle)*  — **append-only periods + operational state**
- **Purpose** — A member's right of access for a period, sold from a plan (MSH-1).
- **Business Responsibility** — Own all membership state, snapshots, and date logic.
- **Relationships / Cardinality** — many→1 Member, Gym, Branch; many→1 Plan (source); **self-reference** `predecessor_membership_id` (renewal/upgrade chain); 1→many MembershipFreeze; 1→many Payment.
- **Immutable Attributes (write-once, I)**

  | Attr | Type | Notes |
  |---|---|---|
  | id, gym_id, branch_id, member_id | Identifier/Reference | |
  | source_plan_id | Reference→Plan | the plan sold from |
  | snapshot_plan_name | ShortText | captured (MSH-2/INV-14) |
  | snapshot_price (= amount_due) | MoneyMinorUnits | captured; the membership's amount due (M-4) |
  | snapshot_currency | CurrencyCode | |
  | snapshot_duration_value | Integer | |
  | snapshot_duration_unit | Enum(`DurationUnit`) | |
  | origin | Enum(`MembershipOrigin`) | NEW/RENEWAL/UPGRADE/DOWNGRADE |
  | predecessor_membership_id | Reference→Membership (nullable) | links the chain (REN-2, immutable-history H-1) |
  | start_date | Date | inclusive start (gym tz) |
  | original_end_date | Date | = start + snapshot duration (immutable; T-3 inclusive) |
  | scheduled_effective_from | Date (nullable) | for SCHEDULED periods (= predecessor effective end + 1) |
  | created_at, created_by | Timestamp-UTC/Reference | |
- **Operational Attributes (mutable, M)** — `activated_at` (Timestamp-UTC, when SCHEDULED→ACTIVE), `cancelled_at`/`cancelled_by` (cancellation — terminal), `updated_at`.
- **Cache Attributes (derived `D`, recomputable — §1.6)** — `cached_status` (Enum `MembershipStatus`), `cached_effective_end_date` (Date = original_end_date + total frozen days), `cached_total_frozen_days` (Integer), `cached_is_expiring_soon` (Boolean). Maintained by sweep/freeze actions; **never authoritative**.
- **Derived (not stored)** — payment standing, outstanding balance (from Payment ledger); `EXPIRING_SOON` may be computed live.
- **Business Constraints** —
  - **At most one ACTIVE and at most one SCHEDULED membership per member** (MBR-4/MSH-7/INV-12). **Authoritative enforcement is a write-path check inside a serializable transaction** — because ACTIVE/EXPIRED are *time-relative* (derived from dates + the gym clock), no static index can guarantee this; a partial-unique index on the `cached_status` cache would be **stale** between actual expiry and the next sweep and would wrongly reject a legitimate new membership. The cache is **not** the guarantee.
  - **Active periods never overlap** for a member (INV-13/T-5). **DB backstop:** a range **exclusion constraint** over `(member_id, [start_date, original_end_date]) WHERE cancelled_at IS NULL` (see §16) prevents gross overlap on the immutable dates; the **write-path transaction** remains authoritative for freeze-extended/clock-relative cases the static range can't see.
  - Snapshot/financial/date-origin fields are **immutable** (INV-14/19).
  - Cancellation is terminal (INV-17): once `cancelled_at` set, no further transitions.
  - Status is **derived** from facts (cancelled_at, freezes, scheduled_effective_from, dates, gym clock) — cache only (INV-29).
- **Business Invariants** — INV-12/13/14/15/16/17/18/19; T-3/4/5; M-4.
- **Lifecycle** — SCHEDULED → ACTIVE → {FROZEN ⇄ ACTIVE} → EXPIRED, or → CANCELLED (state-machines §1). Renewal/upgrade create **new** Membership rows (append-only); predecessor closes at its end.
- **Soft Delete / Archive** — Never hard-deleted (history). No "delete" — cancellation is a recorded terminal state.
- **History Policy** — **Append-only periods** (INV-19); operational fields (activated/cancelled) are recorded transitions, not rewrites of snapshots. Freeze history lives in MembershipFreeze.
- **Future Expansion** — Auto-renewal, multiple concurrent memberships (add-ons), contract document refs, immediate/prorated upgrades, configurable grace.

### 2.14 MembershipFreeze  *(Owning Context: Membership Lifecycle)*  — append-only
- **Purpose** — Record a freeze period; the immutable source of end-date extension (FRZ).
- **Relationships / Cardinality** — many→1 Membership (and Gym). At most one `ACTIVE` freeze per membership.
- **Required Attributes** — `id`, `gym_id`, `membership_id` (Reference→Membership, I), `freeze_start` (Date, I), `planned_end` (Date, nullable, M), `actual_end` (Date, nullable, M — set on resume), `status` (Enum `FreezeStatus`, M), `frozen_days` (Integer, D/M — finalized on resume; extends effective end by exactly this, FRZ-2/INV-18), `created_at`, `created_by`, `ended_by` (nullable).
- **Business Constraints** — Only an ACTIVE membership may have a new freeze (FRZ-4). **At most one `status=ACTIVE` freeze per membership** (partial-unique). `frozen_days` ≥ 0.
- **Business Invariants** — INV-18; T-4.
- **Lifecycle** — Active (paused) → Ended (resumed). Append-only; resume closes the row (sets `actual_end`/`status=ENDED`).
- **History Policy** — Append-only; never edited after closure except to record the resume facts.
- **Future** — Paid vs free freezes, freeze caps (count/duration), auto-resume on date.

### 2.15 Payment  *(Owning Context: Billing & Payments)*  — **append-only financial ledger**
- **Purpose** — A financial transaction record against a membership (PAY-1).
- **Business Responsibility** — Immutable money facts; basis of standing/balance/revenue.
- **Relationships / Cardinality** — many→1 Membership (**Req — PAY-6/INV-20**), many→1 Gym/Branch; self-reference `voids_payment_id` (a VOID entry reverses a PAYMENT).
- **Required Attributes**

  | Attr | Type | Req | Mut | Notes |
  |---|---|---|---|---|
  | id | Identifier | ✓ | I | |
  | gym_id | Reference→Gym | ✓ | I | |
  | branch_id | Reference→Branch | – | I | inherited from membership |
  | membership_id | Reference→Membership | ✓ | I | **never null** (PAY-6) |
  | entry_type | Enum(`PaymentEntryType`) | ✓ | I | PAYMENT / VOID (future REFUND/CREDIT/DISCOUNT) |
  | amount | MoneyMinorUnits | ✓ | I | positive magnitude; effect by `entry_type` |
  | currency | CurrencyCode | ✓ | I | captured (PAY-2) |
  | method | Enum(`PaymentMethod`) | ✓ | I | |
  | received_at | Timestamp-UTC | ✓ | I | when money received (revenue period basis, PAY-5) |
  | recorded_at | Timestamp-UTC | ✓ | I | when entered |
  | recorded_by | Reference→User | ✓ | I | |
  | voids_payment_id | Reference→Payment | – | I | required iff `entry_type=VOID` |
- **Optional Attributes** — `reference` (ShortText — receipt no.), `note`, `void_reason` (for VOID entries).
- **Business Constraints** — **No row is ever updated or deleted** (INV-21/H-2). A correction is a **new `VOID` entry** referencing the original (`voids_payment_id`). A PAYMENT may be voided at most once (unique `voids_payment_id` among VOID entries). `amount` > 0. `currency` matches the membership's snapshot currency in MVP. `membership_id` mandatory (INV-20).
- **Business Invariants** — INV-20/21/22/23/24/25; M-1/2/3/6/7.
- **Derived from this ledger (not stored)** — per-membership **outstanding balance** = `amount_due − Σ(non-voided PAYMENT amounts)`; **payment standing** (PENDING/PARTIALLY_PAID/PAID); **revenue** = Σ(non-voided money received) by `received_at` period (M-5/6).
- **Lifecycle** — Recorded (terminal as a fact); reversed only by an appended VOID entry.
- **Soft Delete** — **None — append-only** (no delete, no archive of financial facts).
- **History Policy** — Pure append-only ledger (immutable-history §3).
- **Future Expansion** — `REFUND`/`CREDIT`/`DISCOUNT` entry types (money-rules §9–12), tax components, installment schedule links, online-gateway transaction refs, receipts.

### 2.16 Notification  *(Owning Context: Notifications)*
- **Purpose** — An in-app alert for staff (NTF-1).
- **Relationships / Cardinality** — many→1 Gym; references Member & Membership (subject).
- **Required Attributes** — `id`, `gym_id`, `type` (Enum `NotificationType`, I), `member_id` (Reference, I), `membership_id` (Reference, I), `dedupe_key` (ShortText, I), `state` (Enum `NotificationState`, M, default UNREAD), `generated_at` (Timestamp-UTC, I), `message` (ShortText, I).
- **Optional Attributes** — `read_at`/`read_by`, `dismissed_at`/`dismissed_by`.
- **Business Constraints** — **Unique `dedupe_key`** within gym to enforce non-duplication (NTF-3/INV-33) — the key encodes `(membership_id, type, period/window)`. Not generated for frozen memberships (FRZ-3). 
- **Business Invariants** — INV-30/33/34.
- **Lifecycle** — Generated→Unread→Read→Dismissed (state-machines §3). Dismissed never resurrected (INV-34).
- **Soft Delete** — State `DISMISSED` removes from active queue; rows retained (history) — soft.
- **History Policy** — Append-only generation; state progression recorded forward.
- **Future** — Channels (email/SMS) → channel/delivery fields; per-user assignment; more types; re-notify cadence.

### 2.17 AuditLog  *(Owning Context: IAM / cross-cutting)*  — **append-only, write-once**
- **Purpose** — Permanent record of sensitive/business-critical actions (immutable-history §4, logging-observability).
- **Relationships / Cardinality** — many→1 Gym; references actor (User) and a target (polymorphic by type+id).
- **Required Attributes** — `id`, `gym_id`, `branch_id` (nullable), `action` (ShortText — `domain.action`, e.g. `payment.recorded`), `actor_user_id` (Reference→User, nullable for system), `target_type` (ShortText), `target_id` (Identifier, nullable), `occurred_at` (Timestamp-UTC, I), `metadata` (JSON — non-sensitive context, ids not bodies), `correlation_id` (ShortText).
- **Business Constraints** — **Write-once; never updated/deleted** (INV-39/H-4). No secrets/PII beyond ids (security-guidelines).
- **Business Invariants** — INV-39.
- **Lifecycle** — Appended; retained permanently (or per retention policy — future).
- **History Policy** — Immutable append-only.
- **Future** — In-app audit-trail UI, retention tiering, export, tamper-evidence (hash chaining).

---

## 3. Relationships (consolidated)

| Relationship | Type | Cardinality | Ownership | On Delete | On Update | Rationale |
|---|---|---|---|---|---|---|
| Gym → Branch | 1—N | one gym, many branches | Gym owns | **Restrict** (soft-archive instead) | cascade tenancy n/a | Never destroy a gym's locations/history |
| Gym → (all business entities) | 1—N | — | Gym owns | **Restrict** | — | Tenancy root; gyms are not deleted |
| User → GymUser | 1—N | one user, many gym memberships | IAM | **Restrict** | — | Multi-gym enabler; preserve audit |
| Gym → GymUser | 1—N | — | IAM | Restrict | — | |
| Role → GymUser | 1—N | one role, many staff | IAM | **Restrict** | — | Can't delete a role in use |
| Capability → Permission | 1—N | — | IAM | Restrict | — | Reference data integrity |
| Role ↔ Permission (RolePermission) | M—N | — | IAM | **Cascade** on RolePermission row only | — | Mapping rows are owned join data |
| Gym → Member | 1—N | — | Member Mgmt | Restrict | — | Members are history-bearing |
| Branch → Member | 1—N | home branch | Member Mgmt | Restrict | — | |
| Member → MemberNote | 1—N | — | Member Mgmt | **Restrict** (soft) | — | Notes retained with member |
| Member → TrainerAssignment | 1—N | history; ≤1 open | Member Mgmt | Restrict | — | Append-only history |
| GymUser(trainer) → TrainerAssignment | 1—N | — | Member Mgmt | **Restrict** | — | Reassign/clear before removing a trainer (INV-36) |
| Gym → Plan | 1—N | — | Plan Catalog | Restrict | — | Plans retired, not destroyed |
| Plan → Membership | 1—N | source plan | Plan Catalog (read) | **Restrict** | — | Protect historical references (PLN-4) |
| Member → Membership | 1—N | periods over time | Membership | **Restrict** | — | History (INV-19) |
| Membership → Membership (predecessor) | 1—1 (chain) | self-ref | Membership | Restrict | — | Renewal/upgrade chain |
| Membership → MembershipFreeze | 1—N | — | Membership | **Restrict** | — | Freeze history immutable |
| Membership → Payment | 1—N | **mandatory parent** | Billing | **Restrict** | — | No orphan payments (PAY-6); never delete financial facts |
| Payment → Payment (voids) | 1—1 | self-ref | Billing | Restrict | — | Append-only void linkage |
| Gym → Notification | 1—N | — | Notifications | Restrict (soft) | — | |
| Membership → Notification | 1—N | subject | Notifications (read) | Restrict | — | |
| Gym → AuditLog | 1—N | — | IAM | **Restrict** | — | Permanent record |

**Referential integrity principles:** explicit FKs everywhere (database-standards); **Restrict is the default** (soft-delete/retire instead of cascade) to protect history/financials; **Cascade only for owned join rows** (RolePermission). **No cascade ever deletes a Member, Membership, Payment, or AuditLog** (INV-40). Cross-context writes are forbidden (INV-38) — FKs express references, not write permission.

---

## 4. Index Strategy (with query justification)

> Every index is justified by a real query (see §5). `gym_id` leads most composites because **every query is tenant-scoped** (INV-2).

### Tenancy & Identity
- **User.email — UNIQUE.** *Query:* sign-in by email. *Reason:* global login identity must be unique and fast.
- **GymUser (gym_id, user_id) — UNIQUE.** *Query:* resolve a user's membership/permissions in a gym. *Reason:* one staff record per user per gym; the authz hot path.
- **GymUser (gym_id, status) — composite.** *Query:* list active staff of a gym. 
- **Role (gym_id, key) — UNIQUE** (gym_id-null treated as global). *Query:* resolve role by key; seed idempotency.
- **Permission.key — UNIQUE; Capability.key — UNIQUE.** *Reason:* stable reference lookups; permission checks.
- **RolePermission (role_id, permission_id) — UNIQUE; index (role_id).** *Query:* resolve all permissions for a role (authz read model §6).

### Member Management
- **Member (gym_id, status, full_name) — composite** *(R-1, perf optimization approved 2026-06-25; subsumes the former `(gym_id, status)`).* *Query:* default active-members list, filtered by status **and** sorted by name in one index. *Reason:* the most frequent member listing (VH) — serves filter + ordered scan without a sort step. (All-status name sort, rare, falls back to a sort / trigram.)
- **Member (gym_id, phone) — UNIQUE (partial: where phone present); Member (gym_id, email) — UNIQUE (partial: where email present).** *Query:* duplicate-contact check at registration; lookup by contact. *Reason:* INV-3 uniqueness per gym; fast desk lookup.
- **Member text/trigram search index** on `full_name` (and optionally phone/email) — *Query:* front-desk search by partial name/phone. *Reason:* B2-style partial search must be fast (see §16 for trigram/`pg_trgm`). *(The standalone `(gym_id, full_name)` B-tree was folded into the `(gym_id, status, full_name)` composite above — R-1.)*
- **Member (gym_id, branch_id) — composite.** *Query:* members by branch (future multi-branch reporting).
- **MemberNote (member_id, created_at) — composite.** *Query:* a member's notes newest-first.
- **TrainerAssignment partial-unique (member_id) WHERE unassigned_at IS NULL.** *Query/constraint:* at most one current trainer (INV-35). **Index (trainer_gym_user_id) WHERE unassigned_at IS NULL** — *Query:* a trainer's current assignees.

### Plan Catalog
- **Plan (gym_id, is_active) — composite.** *Query:* list sellable plans for the sale dropdown. *Reason:* frequent, scoped + filtered.

### Membership Lifecycle (highest-value indexes)
- **Membership (gym_id, member_id) — composite.** *Query:* a member's membership history/profile.
- **Membership (member_id, cached_status) — composite (query accelerator, NOT a uniqueness guarantee).** *Query:* fast "current membership" lookup. **INV-12 (≤1 active, ≤1 scheduled) is NOT enforced here** — it is a write-path check in a serializable transaction (time-relative; §2.13). **INV-13 (no overlap)** is backstopped by a **GiST range exclusion constraint** `EXCLUDE USING gist (member_id WITH =, daterange(start_date, original_end_date, '[]') WITH &&) WHERE (cancelled_at IS NULL)` (§16).
- **Membership (gym_id, cached_status, cached_effective_end_date) — composite.** *Query:* dashboard "active count," "expiring within 7/30 days," the daily expiry sweep. *Reason:* the central reporting/sweep query (RPT-1, NTF-2).
- **Membership (gym_id, source_plan_id) — composite.** *Query:* plan-mix reporting; FK-restrict checks.
- **Membership (predecessor_membership_id).** *Query:* walk renewal/upgrade chains.
- **Membership (gym_id, created_at) — composite.** *Query:* "new memberships this month."
- **MembershipFreeze partial-unique (membership_id) WHERE status='ACTIVE'.** *Constraint:* one active freeze (FRZ). **Index (gym_id, status).** *Query:* currently-frozen memberships (exclude from active counts).

### Billing & Payments
- **Payment (gym_id, membership_id) — composite.** *Query:* a membership's payment ledger; recompute standing/balance. *Reason:* the core financial read.
- **Payment (gym_id, received_at) — composite.** *Query:* revenue for a period (gym tz). *Reason:* RPT revenue (PAY-5).
- **Payment (voids_payment_id) — UNIQUE (partial: where entry_type=VOID).** *Constraint:* a payment voided at most once. *Query:* "is this payment voided?".
- **Payment (gym_id, entry_type, received_at) — composite.** *Query:* revenue excluding voids by period.

### Notifications
- **Notification (gym_id, state) — composite.** *Query:* the staff unread queue; unread count.
- **Notification (gym_id, dedupe_key) — UNIQUE.** *Constraint:* non-duplication (INV-33).
- **Notification (gym_id, membership_id) — composite.** *Query:* alerts for a membership (suppress on renewal).

### Audit
- **AuditLog (gym_id, occurred_at) — composite.** *Query:* recent activity feed / audit browse.
- **AuditLog (gym_id, target_type, target_id) — composite.** *Query:* history of one entity.
- **AuditLog (gym_id, actor_user_id, occurred_at).** *Query:* a user's actions.

### Future Index Candidates (add when the query appears — avoid premature indexing)
- Member full-text across name+phone+email (if search broadens).
- Payment (gym_id, recorded_by) for staff collections reports.
- Membership (gym_id, branch_id, cached_status) when multi-branch dashboards land.
- Partial indexes for `archived_at IS NULL` if archived volume grows large.

---

## 5. Query Patterns (per entity — these justify §4)

> Frequency legend: **VH** very high (per interaction), **H** high (per page/day), **M** medium, **L** low/scheduled. Performance targets per `ADR §14 AC-NFR-4` (lists/dashboard < ~2s at 5k members).

### Member
- **Most frequent:** list active members (paginated) — `WHERE gym_id=? AND status='ACTIVE'` sort `full_name` — **VH**, < 300ms.
- **Search:** partial name/phone/email — trigram/text — **VH**, < 300ms.
- **Lookup:** by id (profile); by exact contact (dedupe) — **H**, < 50ms.
- **Filtering/Sorting:** status, branch; by name/joined_on. **Pagination:** page/size, default 25, max 100 (api-standards).

### Membership
- **Most frequent:** a member's memberships (profile) — `WHERE gym_id=? AND member_id=?` — **H**.
- **Current membership:** active/scheduled for a member (partial-index) — **H**, < 50ms.
- **Dashboard/sweep:** expiring within N days & expired — `WHERE gym_id=? AND cached_status IN(...) AND cached_effective_end_date BETWEEN ...` — **H/L (sweep)**, < 1s.
- **New this month:** `WHERE gym_id=? AND created_at >= month_start` — **H**.

### Payment
- **Ledger for a membership:** `WHERE gym_id=? AND membership_id=?` → recompute standing/balance — **H**, < 100ms.
- **Revenue for period:** `WHERE gym_id=? AND entry_type='PAYMENT' AND received_at IN [period]` minus voids — **H (dashboard)**, < 1s.
- **Outstanding:** memberships with balance > 0 (derived; see read model) — **M**.

### Notification
- **Unread queue/count:** `WHERE gym_id=? AND state='UNREAD'` — **VH**, < 100ms.
- **Dedupe check on generation:** by `dedupe_key` — **L (sweep)**.

### Plan
- **Active plans:** `WHERE gym_id=? AND is_active=true` — **H (sale)**, < 50ms.

### GymUser / authz
- **Resolve permissions:** GymUser→Role→RolePermission→Permission for `(gym_id,user_id)` — **VH (every action)** — cached read model §6, < 20ms.

### AuditLog
- **Activity feed:** `WHERE gym_id=? ORDER BY occurred_at DESC` — **M**.
- **Entity history:** `WHERE gym_id=? AND target_type=? AND target_id=?` — **L**.

---

## 6. Read Model Expectations (no CQRS — derived/materialized reads)

These are **derived reads** composed from the owning contexts (`module-communication.md`); none introduce a write model or duplicate business rules.

| Read Model | Required Aggregations | Refresh Strategy | Performance |
|---|---|---|---|
| **Dashboard** | active members, memberships expiring 7/30d, new members this month, revenue this month | On-view, computed live from indexed queries; optional 1–5 min cache | < 2s |
| **Revenue Summary** | Σ non-voided payments received by period (gym tz), excl. Pending/Void (M-6) | On-view; optional nightly rollup table (future) | < 1s |
| **Expiring Memberships** | memberships with `cached_status=ACTIVE` and effective end within window, excl. frozen | Live; backed by the daily sweep cache | < 500ms |
| **Outstanding Balances** | per Active membership: amount_due − Σ non-voided payments > 0 | On-view from Payment ledger; optional per-membership cached balance | < 1s |
| **Member Profile** | member + current membership (derived status/standing/balance) + notes + current trainer + payment history | On-view by id joins | < 300ms |
| **Payment History** | membership's ledger with running balance, void linkage | On-view | < 200ms |
| **Trainer Overview** | a trainer's current assignees (+ each member's membership status) | On-view via open assignments | < 500ms |
| **Effective Permissions** | union of a GymUser's role permissions | Cached per session; invalidate on role/mapping change | < 20ms |

**Refresh philosophy:** derive on read for correctness; introduce **materialized rollups only when a measured query is too slow** (avoid premature optimization). The **daily sweep** maintains membership status caches and generates notifications; caches are recomputable (§1.6).

---

## 7. Data Volume Assumptions (growth & scaling)

| Entity | Small (1 gym) | Medium (10–50 gyms) | Large (500 gyms) | Enterprise (5k+ gyms / chains) |
|---|---|---|---|---|
| Gyms | 1 | 10–50 | ~500 | 5,000+ |
| Branches | 1 | 1–3 each | 1–10 each | 10–100 each |
| Members | 100s–2k | 10k–100k | ~1M | 10M+ |
| Memberships (periods, append-only) | ×3–10 members | ×3–10 | several M | 50M+ |
| Payments (ledger) | ×1–3 memberships | grows fastest | tens of M | 100M+ |
| Notifications | low (expiry-driven) | 10k–100k | M+ | 10M+ |
| MemberNotes | sparse | 10k+ | M | 10M+ |
| AuditLog | grows steadily | high | very high | partition candidate |

**How the design scales:**
- **Tenant isolation by `gym_id`** + `gym_id`-leading indexes keep per-gym queries fast regardless of total rows (a gym only ever touches its slice).
- **Append-only Payments/Memberships/AuditLog** grow without update contention; the heaviest tables are **partition candidates by `gym_id` or time** at Large/Enterprise (§15/§16).
- **Derived reads** avoid storing redundant aggregates that would contend on writes.
- **No cross-gym query** exists, so total platform size doesn't degrade tenant performance.

---

## 8. Money Model (honors money-rules.md)
- **Precision:** `MoneyMinorUnits` (Integer) + `CurrencyCode`; never floats (M-1).
- **Amount due:** a Membership's `snapshot_price` (immutable, M-4).
- **Outstanding Balance (derived):** `amount_due − Σ(non-voided PAYMENT amounts)` per membership (M-5); not stored as truth (optional cache).
- **Payment standing (derived):** PENDING/PARTIALLY_PAID/PAID from the ledger (PAY-3).
- **Partial payments:** multiple PAYMENT entries per membership; balance recomputes (PAY-6 attribution, INV-20).
- **Revenue (derived):** Σ non-voided money received by `received_at` period, gym tz; excludes Pending/Void (M-6, INV-25).
- **Void:** an appended `VOID` entry referencing the original (never an edit/delete) — INV-21.
- **Scheduled obligation (ADR-025/M-9):** a Scheduled membership's due enters current balance/dashboards **only on activation**; pre-payment allowed (a PAYMENT entry against the scheduled membership; revenue counts when received).
- **Future (pre-shaped, additive):** `REFUND`/`CREDIT`/`DISCOUNT` entry types; `tax` components on amounts; coupon/discount capture on membership creation — all as new entry types/fields, never edits to history (money-rules §9–12).
- **Financial integrity:** append-only ledger + immutable captures + restrict-deletes guarantee reproducible history (INV-39).

## 9. Time Model (honors time-rules.md)
- **UTC storage** for all timestamps (T-1); **gym time zone** governs business-day decisions at read (T-2).
- **Dates** (start/end) are calendar days; **end day inclusive**, EXPIRED begins the day after (T-3).
- **Expiration (derived):** from `original_end_date` + frozen days vs gym "today"; cache + daily sweep (T-6/7).
- **Renewal timing:** new period starts later of today / day-after-current-end; early renewal → SCHEDULED (REN-1).
- **Scheduled memberships:** `scheduled_effective_from` = predecessor effective end + 1; activate on/after that day (MSH-7/T-5); **no Active overlap** (INV-13).
- **Freeze timing:** `MembershipFreeze` records extend effective end by exactly `frozen_days` (T-4/INV-18); frozen memberships don't expire while paused (FRZ-3).
- **Notification window:** Expiring-Soon = effective end within gym `expiring_soon_window_days`; idempotent non-duplicating sweep (T-7/INV-30).
- **Grace period:** `Gym.grace_period_days` (default 0 = none in MVP); additive (T-11).
- **Historical accuracy:** immutable dates + append-only periods make any past state reproducible (T-6, immutable-history).

## 10. Authorization Model (DB implications only — honors authorization-architecture.md)
- **Users** global; **GymUser** binds user↔gym↔role (tenant-scoped).
- **Permissions/Capabilities** = global reference data; **Permission.key immutable** (INV-7).
- **Roles** = permission bundles; `is_assignable` flag marks **dormant** roles; **`gym_id` nullable** to allow future gym-custom roles without migration.
- **RolePermission** = the data that *is* access; granting = row insert (no code) — INV-5/6.
- **Effective permissions** resolved by join (cached read model §6); **no role-name is ever stored in business logic or used as a check** (INV-5).
- **Dormant roles (Front Desk, Manager, Receptionist, Accountant, Branch Manager)** are **seeded** with their permission mappings and `is_assignable=false` (security R4: seeded **unassignable**) — present in migrations, never assigned/shown in MVP.
- **Future:** `GymUserRole` (many roles per staff), branch-scoped permissions, gym-custom roles.

## 11. Immutable History (honors immutable-history.md)
- **Immutable Memberships:** append-only periods; snapshot/date/origin fields write-once (INV-14/19). Renewal/upgrade = new rows; predecessor closes.
- **Immutable Payments:** append-only ledger; corrections via appended `VOID` (INV-21).
- **Append-only Audit:** `AuditLog` write-once (INV-39).
- **Notifications:** append-only generation; forward-only state.
- **Historical reporting:** all derived figures recompute from immutable facts → reproducible for any past date (H-7).
- **Versioning strategy:** entities that evolve (plans) keep history via **snapshots on dependent records** (memberships), not by mutating the past; future "plan versions" are effective-dated rows (additive).

## 12. Data Ownership (one writer per entity — honors data-ownership.md)

| Entity | Owning (writing) Context | Forbidden writers |
|---|---|---|
| Gym, Branch, User, GymUser, Role, Permission, Capability, RolePermission, AuditLog | **IAM** | all others |
| Member, MemberNote, TrainerAssignment | **Member Management** | all others |
| Plan | **Plan Catalog** | all others |
| Membership, MembershipFreeze | **Membership Lifecycle** | **Billing must not write these** (INV-38) |
| Payment | **Billing & Payments** | **Membership must not write these** (INV-38) |
| Notification | **Notifications** | all others |

No entity has two owners (INV-37). FKs express *references*, not write rights; cross-context mutation is forbidden in code (module-communication).

## 13. Business Invariants — enforcement mapping
Each invariant (`business-invariants.md`) is preserved by a specific mechanism:

| Invariant | DB mechanism |
|---|---|
| INV-1/2 tenancy | `gym_id` on every business table + `gym_id`-scoped queries/indexes |
| INV-3 unique contact/gym | partial-unique `(gym_id, phone)`/`(gym_id, email)` **scoped to non-archived** (`AND archived_at IS NULL`); reactivation-dedup is a write-path behavior |
| INV-5/6/7 permission-based, immutable keys | Permission/Role/RolePermission tables; `Permission.key` immutable; no role column used in logic |
| INV-11 archive guard | write-path check (no Active/Scheduled membership + zero balance) before setting `status=ARCHIVED` |
| INV-12 one active/one scheduled | **write-path check in a serializable transaction** (authoritative — time-relative, cannot be a static index); `cached_status` index is a query accelerator only |
| INV-13 no overlap | **GiST range exclusion constraint** on non-cancelled `(member_id, [start,end])` as DB backstop **+** write-path check for freeze-extended/clock-relative cases; `scheduled_effective_from = predecessor end + 1` |
| INV-14/19/21/39 immutability | write-once columns; append-only ledger; no UPDATE/DELETE on Payment/AuditLog; restrict deletes |
| INV-15 access ≠ payment | status derived from dates/cancel/freeze only — payment never an input |
| INV-16 deferred upgrade | upgrade creates SCHEDULED membership; no proration fields |
| INV-20 payment attribution | `Payment.membership_id` NOT NULL |
| INV-25 revenue excludes voids | revenue query filters `entry_type='PAYMENT'` minus voided |
| INV-30/33 dedup/idempotent | `Notification.dedupe_key` UNIQUE; idempotent sweep |
| INV-35 one current trainer | partial-unique open assignment `(member_id) WHERE unassigned_at IS NULL`; FK to GymUser of same gym |
| INV-36 no dangling trainer | **write-path rule on trainer revoke** (reassign/clear that trainer's open assignments) — *not* an FK cascade/restrict, since trainers are soft-revoked (the FK never fires) |
| INV-40 soft delete | `archived_at`/status flags; FK **Restrict** (no destructive cascade) |

## 14. Scalability
- **Multi-Gym:** native via `gym_id`; no schema change to onboard gyms (ADR-007).
- **Multi-Branch:** `branch_id` present from day one (nullable/defaulted); branch dashboards/permissions activate without migration.
- **Future Mobile / Public API:** read the same model via the domain layer; **Public API** versions its contract, not the schema (ADR-015).
- **Future Attendance:** a new `Attendance`/`CheckIn` entity (gym_id, member_id, branch_id, occurred_at) — additive, references Member; no change to existing tables.
- **Future Billing (online):** new Payment entry types + gateway-transaction refs; subscription-billing of gyms is a separate SaaS-billing schema.
- **Future Integrations/Reporting:** read replicas + materialized rollups; partition heavy append-only tables (Payment, AuditLog, Membership) by `gym_id`/time at scale.

## 15. Migration Strategy (per-entity evolution)
- **Gym/Branch:** add settings (feature flags, billing, per-branch tz) — additive columns.
- **User/GymUser:** add MFA/SSO/profile; add `GymUserRole` join for multi-role (backward-compatible: keep `role_id` until migrated).
- **Role/Permission:** **append-only** permission keys; add gym-custom roles via existing nullable `gym_id`; never rename keys (INV-7).
- **Member:** add custom fields/consent/photo; portal account link.
- **Plan:** introduce effective-dated **plan versions** (new table) without touching membership snapshots.
- **Membership:** add auto-renewal, contract refs, multiple-concurrent support (relax partial-unique deliberately); predecessor chain already supports history.
- **Payment:** add `REFUND/CREDIT/DISCOUNT` entry types, tax components, gateway refs — additive enum/columns; **never** alter existing rows.
- **Notification:** add channel/delivery fields, types; per-user assignment.
- **Backward compatibility:** all changes are **additive, forward-only migrations** (database-standards); destructive changes require explicit approval + backout; backfills are separate idempotent steps.

## 16. Implementation Notes  *(ORM/engine guidance — NOT business design)*
> Clearly separated. Useful only for deterministic Prisma/Postgres generation. Nothing here changes a business rule.
- **Identifiers:** **UUID v7** — the project standard (finalized 2026-06-25). CUID, CUID2, auto-increment, and random UUIDv4 are **not** used. Stored as a **native Postgres `uuid`** column; every FK scalar is also `uuid`. Map `Identifier`→`@id @default(uuid(7)) @db.Uuid`. PG18's native `uuidv7()` is an optional column-level `DEFAULT` for non-ORM inserts (defense-in-depth). Rationale & strategy: `/docs/database/identifier-strategy.md`.
- **Money:** store `MoneyMinorUnits` as `BigInt`/`Integer`; `CurrencyCode` as `Char(3)`/`VarChar(3)`. Never `Float`/`Decimal`-as-float.
- **Time:** `Timestamp-UTC`→`timestamptz`; `Date`→`date`. Application layer converts to gym tz for display/judgment.
- **Enums:** native Postgres enums or `VarChar` + CHECK; mirror §1.8 exactly. Prisma `enum` per §1.8.
- **Partial uniques** (one open freeze; one open assignment per member; voided-once) → Postgres **partial unique indexes** (`WHERE` predicate), authored as raw SQL in the migration (Prisma doesn't express predicate uniques natively).
- **No-overlap backstop (INV-13):** a **GiST exclusion constraint** `EXCLUDE USING gist (member_id WITH =, daterange(start_date, original_end_date, '[]') WITH &&) WHERE (cancelled_at IS NULL)` — requires the `btree_gist` extension; authored as raw migration SQL. It is a *backstop on immutable dates*, **not** the full guarantee.
- **One active / one scheduled (INV-12) is NOT a DB constraint** — it is enforced in the application **inside a `SERIALIZABLE` transaction** (re-check the member's current memberships from immutable facts before insert). Do **not** add a partial-unique on `cached_status` for this — the cache lags the gym clock and would reject valid inserts. `cached_status` is a query accelerator only.
- **Status caches** (`cached_status`, `cached_effective_end_date`, `cached_total_frozen_days`, balances): maintained by the **daily sweep job** and on relevant writes; treat as denormalized cache with a reconciliation job. Source of truth remains the immutable facts — never enforce invariants on a cache.
- **Search:** enable `pg_trgm`; GIN trigram index on `Member.full_name` (+ contact) for fast partial search.
- **Append-only enforcement:** Payment/AuditLog get **no update/delete code paths**; optionally enforce with DB triggers/permissions denying UPDATE/DELETE.
- **Tenancy:** consider **Postgres Row-Level Security** keyed on `gym_id` as Phase-2 defense-in-depth (ADR §7); MVP enforces in the data-access layer.
- **Prisma 7** (finalized 2026-06-25): the `datasource` block carries **`provider` only** — the connection URL moves to **`prisma.config.ts`** (`datasource.url = env("DATABASE_URL")`). The generator is the new **`prisma-client`** (TS/ESM) with a **required `output`** (`runtime`/`moduleFormat` set explicitly). Runtime connects via the **`@prisma/adapter-pg`** driver adapter (`new PrismaClient({ adapter })`); Prisma client singleton; migrations via Prisma Migrate; single `schema.prisma` (ADR §11). `@@map` snake_case plural tables; `@map` snake_case fields (naming-conventions). See `/docs/database/prisma-7-strategy.md`.
- **Partitioning (future):** Payment/AuditLog/Membership by `gym_id` hash or `created_at` range at Large/Enterprise volumes.
- **Seed:** Permissions, Capabilities, system Roles (Owner/Trainer assignable; Front Desk & others dormant `is_assignable=false`), RolePermission mappings, one Gym + default Branch + Owner GymUser, **and a reserved `system-actor` User** (a global, non-login User used as `created_by`/`recorded_by` for system-originated writes — e.g. sweep/automation-created memberships — so `Membership.created_by` and `Payment.recorded_by` stay NOT NULL with honest attribution; F-2 resolved 2026-06-25). `AuditLog.actor_user_id` stays nullable for system actions.

---

## 17. Final Database Architecture Review

| Review axis | Finding |
|---|---|
| **Business consistency** | ✅ Every attribute/constraint traces to a cited rule; no rule redefined. |
| **Relationship correctness** | ✅ Cardinalities match domain-model; Payment→Membership mandatory (PAY-6); predecessor chain models history. |
| **Ownership correctness** | ✅ One writing context per entity (§12); FKs are references, not write rights (INV-37/38). |
| **Invariant preservation** | ✅ All 40 invariants mapped to a concrete mechanism (§13); immutability via append-only + write-once + restrict. |
| **Index strategy** | ✅ Every index justified by a §5 query; `gym_id`-leading. Partial uniques enforce one-open-freeze / one-open-assignment / voided-once. **One-active/one-scheduled (INV-12) is enforced by a serializable write-path check, not an index** (time-relative); no-overlap (INV-13) has a GiST exclusion backstop. Caches never enforce invariants. |
| **Query optimization** | ✅ Hot paths (member list/search, current membership, dashboard/sweep, payment ledger, unread queue, permission resolution) all indexed; targets stated. |
| **Scalability** | ✅ Tenant-isolated; append-only growth; partition candidates identified; multi-branch/gym native; future modules additive. |
| **Maintainability** | ✅ Derived-not-stored discipline; one enum vocabulary; additive migrations; no premature optimization. |
| **AI readability** | ✅ Deterministic attribute tables (type/req/mutability), explicit constraints, cited invariants — no guesswork on relationships/ownership/indexing. |
| **Future evolution** | ✅ Per-entity migration paths; refunds/tax/credits, multi-role, plan-versions, attendance, online billing all pre-shaped as additive. |

**Open items handed to implementation (not design gaps):**
- **R2 (deferred-upgrade edge):** cancelling a predecessor that has a Scheduled successor — define activation/effective-date recomputation in the sweep (state-machines edge case). The model supports both (recompute `scheduled_effective_from` or activate); **decision recorded for the sweep spec, not the schema.**
- **One-active/one-scheduled (INV-12)** is enforced **only** by the serializable write-path check on immutable facts (no `cached_status` partial-unique — it would lag the gym clock and reject valid inserts). **INV-13** adds a GiST exclusion-constraint backstop. Implementations must not substitute a cache-based unique index for the transaction check.

**Conclusion:** This DDS is complete and internally consistent with all governance. Generating the Prisma schema (or any ORM/SQL) from it is a **deterministic translation** (§16), not a design activity. Two engineers following this spec would produce equivalent schemas; business rules cannot be silently changed during implementation.

---

*End of Database Design Specification. Authoritative for the data model. Changes follow the same versioning/approval rules as the ADR (decision-log).*
