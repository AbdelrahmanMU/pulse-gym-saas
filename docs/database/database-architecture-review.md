# Database Architecture Review
### PULSE Gym SaaS · Final pre-bootstrap review of the Prisma schema against the DDS

| | |
|---|---|
| **Status** | ✅ Authoritative review record (2026-06-25) |
| **Reviewer roles** | Principal Database Architect · PostgreSQL Architect · Prisma Architect · DB Reliability Engineer · Enterprise SaaS Architect · AI Development Lead |
| **Source of truth** | `/docs/architecture/database-design-specification.md` (DDS). The Prisma schema is a *deterministic translation* of the DDS and is **not** assumed correct merely because it validates. |
| **Subject** | `/prisma/schema.prisma` (validated under **Prisma 7.x** — `prisma validate` → "valid 🚀") · `/prisma.config.ts` |
| **Companion docs** | identifier-strategy · prisma-7-strategy · initial-migration-specification · database-integrity-test-plan · database-performance-review · database-readiness-report |

> **Method.** Every model, field, relation, default, and index in the schema was compared field-by-field to the DDS entity tables (§2), enums (§1.8), relationships (§3), and indexes (§4). Each difference between "what the DDS says" and "what the schema expresses" is classified **Intentional**, **Accidental**, **Missing**, or **Forbidden**, with the DDS citation that governs it.

---

## 1. Classification key

| Class | Meaning | Disposition |
|---|---|---|
| **Intentional** | A deliberate implementation decision sanctioned by the DDS (esp. §16) or required by Prisma/Postgres mechanics. Traceable; no business rule changed. | Keep; documented. |
| **Accidental** | An unintended deviation from the DDS (wrong type/nullability/cardinality, missed field). | Must fix before bootstrap. |
| **Missing** | A DDS-mandated constraint that **cannot** be expressed in `schema.prisma` and must live in the migration (raw SQL). | Carried to the migration spec (Task 5). Not a defect — a layering fact. |
| **Forbidden** | A construct the constitution/DDS prohibits (role-name logic, float money, business table without `gym_id`, mutated history, bespoke pattern). | Must remove. |

---

## 2. Intentional implementation decisions (sanctioned)

| # | Decision | DDS basis | Note |
|---|---|---|---|
| I-1 | **UUID v7** PKs, native `uuid` column, `@default(uuid(7)) @db.Uuid`; every FK scalar also `@db.Uuid` | §16 (now finalized to UUIDv7), §1.1 | See identifier-strategy.md. FK type-match is mandatory in Postgres. |
| I-2 | Money → `BigInt` | §16 "BigInt/Integer" | Overflow-safe for revenue sums; money is "sacred". |
| I-3 | `CurrencyCode` → `@db.Char(3)` | §16 "Char(3)/VarChar(3)" | Fixed-length ISO-4217. |
| I-4 | All other `ShortText`/`Text` → `text` | §16 (no length caps in DDS) | Adding `VarChar(n)` would be a new decision. |
| I-5 | `Timestamp-UTC`→`@db.Timestamptz`, `Date`→`@db.Date` | §16, §1.5 | |
| I-6 | `onDelete: Restrict` explicit on **every** FK; `Cascade` only on `RolePermission.{role,permission}` | §3 ("Restrict is the default… Cascade only for owned join rows") | Explicit because Prisma's default for *optional* relations is `SetNull`, which would violate §3. |
| I-7 | `@@unique([voidsPaymentId])` (no partial) to enforce "a payment is voided at most once" | §2.15, §4 | Postgres treats NULLs as distinct, so non-VOID rows coexist; the `WHERE entry_type='VOID'` predicate is implied. |
| I-8 | `@@unique([gymId, key])` on Role + raw-SQL partial for platform keys | §2.5, §4 | Composite unique covers gym-custom roles; platform (`gym_id IS NULL`) uniqueness depends on the migration's partial unique (see Missing M-1). |
| I-9 | Explicit `@relation` names on all `User` relations, both self-relations (`MembershipChain`, `PaymentVoid`), and trainer link | Prisma mechanics | Mandatory when ≥2 relations join the same pair of models; named uniformly for determinism. |
| I-10 | Column defaults: `status=ACTIVE`, `is_active=true`, `expiring_soon_window_days=7`, `grace_period_days=0`, `cached_total_frozen_days=0`, `cached_is_expiring_soon=false`, `FreezeStatus=ACTIVE`, `NotificationState=UNREAD` | §1.8, §2.1/§2.4/§2.13/§2.14/§2.16 | Each is a DDS-stated default or the single logically-determined initial state. **`cached_status` / `cached_effective_end_date` intentionally have NO default** — set explicitly at creation (caches, never authoritative). |
| I-11 | `@default(now())` on `created_at` and creation-anchor instants (`assigned_at`, `recorded_at`, `generated_at`, `occurred_at`); `@updatedAt` on `updated_at` | §1.3 | `received_at` has **no** default (caller supplies when money was received — PAY-5). |
| I-12 | Required `created_by`/author/recorder where DDS places them in required/immutable blocks (`Membership.created_by`, `MembershipFreeze.created_by`, `MemberNote.author_user_id`, `TrainerAssignment.assigned_by`, `Payment.recorded_by`); nullable where DDS marks optional (`GymUser`, `Member`, `Plan`) | §1.3, §2.x | |
| I-13 | No `updated_at` on append-only tables (Payment, AuditLog, MembershipFreeze, TrainerAssignment, Notification) | §1.3 | TrainerAssignment uses `assigned_at`; AuditLog `occurred_at`; Notification `generated_at` as the creation anchor (no synthetic `created_at` added). |
| I-14 | `Branch.address` → `Json?` | §2.2 ("address (JSON/Text)") | Structured JSON chosen over free text. |
| I-15 | `AuditLog.target_id` → `@db.Uuid` (polymorphic, **not** an FK relation) | §2.17 (`target_id` Identifier; target is `target_type`+`target_id`) | All entity PKs are uuid, so the column type is uuid; no relation (polymorphic). |
| I-16 | **Prisma 7** config model (`datasource` provider-only; URL in `prisma.config.ts`; `prisma-client` generator; `@prisma/adapter-pg`) | §16 (updated) | See prisma-7-strategy.md. |
| I-17 | `PaymentStanding` enum declared but **never** persisted | §1.8, §1.6 | Mirrors the DDS vocabulary; standing is derived from the ledger, not stored. |

**Items flagged for human confirmation — RESOLVED 2026-06-25:**
- **F-1 `AuditLog.metadata` → made NULLABLE** (`Json?`); `correlation_id` stays NOT NULL (every request has one). *(Ratified: keep metadata nullable.)*
- **F-2 `Membership.created_by` stays NOT NULL.** *(Ratified: mandatory.)* System-originated creations attribute to a reserved **`system-actor` User** (global, non-login; seeded — DDS §16). This keeps `created_by`/`recorded_by` honest without a nullable column. `AuditLog.actor_user_id` remains nullable for pure system events.

---

## 3. Accidental deviations

**None found.** Every difference between the DDS and the schema resolves to an Intentional decision (§2) or a Missing-by-design constraint (§4). The relation graph is complete and symmetric (every relation has both sides; `prisma validate` passes under Prisma 7), all 17 entities and 11 enums are present, every business table carries `gym_id`, and no field's type/nullability contradicts its DDS entity row.

---

## 4. Missing-by-design (DDS-mandated, not expressible in `schema.prisma` → migration)

These are **not** schema defects; Prisma cannot express predicate-scoped uniqueness, exclusion constraints, CHECKs, or extension management. Each is carried verbatim into the **initial-migration-specification** (Task 5) and is also listed in the schema header.

| # | Construct | DDS basis |
|---|---|---|
| M-1 | Partial unique `Role(key) WHERE gym_id IS NULL` (platform-role key uniqueness) | §4 ("gym_id-null treated as global") |
| M-2 | Partial unique `Member(gym_id,phone)` / `(gym_id,email)` `WHERE … IS NOT NULL AND archived_at IS NULL` | INV-3, §13, §2.9 |
| M-3 | Partial unique `TrainerAssignment(member_id) WHERE unassigned_at IS NULL` | INV-35, §4 |
| M-4 | Partial index `TrainerAssignment(trainer_gym_user_id) WHERE unassigned_at IS NULL` | §4 |
| M-5 | Partial unique `MembershipFreeze(membership_id) WHERE status='ACTIVE'` | §2.14, §4 |
| M-6 | GIN trigram index on `Member.full_name` (+ phone/email); `pg_trgm` extension | §4, §16 |
| M-7 | GiST exclusion on `Membership` non-overlap (INV-13 static backstop); `btree_gist` extension | INV-13, §16, §2.13 |
| M-8 | CHECKs: `Member(phone OR email)`, `Payment(amount>0)`, `Plan(price>=0 AND duration_value>0)`, `Gym(windows>=0)`, `MembershipFreeze(frozen_days>=0)` | §2.x business constraints |

**Write-path-only invariants (never a DB constraint — by DDS design, not a gap):** INV-12 (≤1 ACTIVE + ≤1 SCHEDULED, SERIALIZABLE), INV-13 clock-relative overlap, INV-36 (no dangling trainer on soft-revoke), INV-11 (archive guard), Payment.currency = membership snapshot currency (cross-table). DDS §2.13/§16 explicitly forbid substituting a `cached_status` partial-unique for the INV-12 transaction check.

---

## 5. Forbidden constructs

**None present.** Verified against the constitution §9 hard prohibitions:
- ✅ Every **business** table has `gym_id`. The only tables without it — `User`, `Permission`, `Capability` (global), and `Role` (`gym_id` nullable = platform) — are the DDS §1.2-sanctioned exceptions.
- ✅ No role-name is used as logic. `Role.key` exists only as **data**; authorization resolves through `RolePermission` → `Permission`. No `requireRole`/`role===`/`switch(role)` is expressible or implied here.
- ✅ Money is `BigInt` minor units + `Char(3)` currency — **no floats**.
- ✅ Immutable history is modelled append-only (no `updated_at` on ledgers; `VOID` linkage; predecessor chain). Schema does not *enforce* immutability (a DB trigger option is noted in the migration), but it introduces **no** mutation path that the DDS forbids.
- ✅ No Repository/microservice/CQRS/ES/DDD-aggregate constructs; Prisma is the data layer (ADR).

---

## 6. Task 4 — YAGNI review of every optional/nullable field

Every nullable field was bucketed: **(1) DDS-mandated day-one / architecturally load-bearing** → keep; **(2) captured or consumed by an MVP workflow / present-day data** → keep; **(3) no identifiable MVP consumer** → **remove** (default), documented only in Future Expansion, veto-able by the human.

### 6.1 Removed (bucket 3) — now MVP-absent, documented in Future Expansion

| Field | Why removed | Authoritative trace | DDS reconciled |
|---|---|---|---|
| `Gym.branding` (Json) | No MVP consumer; MVP theming is token-based (`--brand-*` white-label seam, design-tokens §1) | business-rules **GYM-2** lists per-gym branding as *future* | §2.1 Optional → Future Expansion |
| `Gym.business_hours` (Json) | No MVP scheduling/attendance feature to consume it | business-rules **GYM-2** lists business hours as *future* | §2.1 Optional → Future Expansion |
| `Branch.time_zone` | Time zone is gym-wide in MVP | **GYM-2** (tz is a gym setting); per-branch tz is future | §2.2 Optional → Future Expansion |
| `GymUser.branch_id` | Branch-scoped staff is future | authorization-architecture **A1** ("future extension") | §2.4 Optional → Future Expansion |
| `GymUser.invited_at` | Invitation workflow is future | domain-model / bounded-contexts ("invitation status" future) | §2.4 Optional → Future Expansion |
| `GymUser.accepted_at` | Invitation workflow is future | domain-model / bounded-contexts | §2.4 Optional → Future Expansion |

> ⚠️ **One flagged tension (veto point):** PRD line 34 ("Configuration (currency, timezone, branding) is per-tenant, not hardcoded") and the PRD §321 `organizations` sketch list `branding` as tenant config, **conflicting** with business-rules GYM-2 (branding = future). Per constitution §13 (two docs conflict → surface, don't silently pick), this review **removes** `branding` (GYM-2 + token-based theming win for MVP) and flags it for your decision. If you want a `branding` JSON in MVP, veto this one line and I'll restore it + reconcile GYM-2.

### 6.2 Kept — bucket 1 (DDS-mandated day-one / load-bearing)

| Field(s) | Why kept (removal would break the DDS) |
|---|---|
| `branch_id` on Member (required), Membership (required), Payment (opt), AuditLog (opt) | DDS §1.2/§14: "present from day one… multi-branch activates **without migration**." `Member.branch_id` is required *and* indexed — it is used today, not speculative. |
| `Role.gym_id` (nullable) | DDS §10: nullable to allow future gym-custom roles "without migration." The platform-role partial-unique (M-1) depends on it. |
| `cached_status`, `cached_effective_end_date`, `cached_total_frozen_days`, `cached_is_expiring_soon` | DDS §1.6/§2.13: labelled caches maintained by the sweep; the dashboard/sweep indexes (§4) depend on them. |

### 6.3 Kept — bucket 2 (present-day data / MVP-consumed)

| Field(s) | Consumer / justification |
|---|---|
| `Member.date_of_birth, gender, joined_on, phone, email, notes_summary` | Registration captures these today (MBR-2; member profile read model §6). |
| `User.phone, avatar_url, last_login_at` | Profile + `last_login_at` audited (§2.3). |
| `Gym.contact_email, contact_phone` | Gym profile/settings (present data, not a future feature). |
| `Gym.grace_period_days` (default 0) | Named element of the **time model** (time-rules T-11; DDS §9/§13). Default 0 = no grace in MVP, but the expiry computation may read it. *Kept conservatively;* veto → remove if you want a pure-MVP schema. |
| `Plan.description, tier` | Plan catalog display (tier = data-viz tier, §2.12). |
| Soft-delete / lifecycle fields: `archived_at`, `deactivated_at`, `revoked_at`, `cancelled_at/by`, `activated_at`, `read_at/by`, `dismissed_at/by` | Used by MVP soft-delete (INV-40), membership lifecycle (state-machines), and notification state machine (§2.16). |
| `Payment.reference, note, void_reason`; `MemberNote.category` | Optional present-day capture; `void_reason` used when voiding (PAY). |
| `AuditLog.branch_id, actor_user_id, target_id` | Nullable per §2.17 (system actions, gym-level events). |

---

## 7. Documentation reconciliation log (every doc edit made by this review)

To keep "a fact lives in exactly one place" and the verdict's "fully aligned" precondition true, the following edits were applied. **No invariant, constraint, cardinality, or business-rule text was changed** — edits are limited to implementation notes and optional-attribute lists.

| Doc | Section | Change | Driver |
|---|---|---|---|
| DDS | §2.1 Gym | Removed `branding`, `business_hours` from Optional Attributes; added to Future Expansion | Task 4 |
| DDS | §2.2 Branch | Removed `time_zone` from Optional Attributes (already in Future Expansion) | Task 4 |
| DDS | §2.4 GymUser | Removed `branch_id`, `invited_at`, `accepted_at` from Optional Attributes (already in Future Expansion); kept `revoked_at` | Task 4 |
| DDS | §1.1 | "UUID/CUID class" → "**UUID v7**" | Task 2 |
| DDS | §16 | Identifier note → UUIDv7 + native `uuid` + `@db.Uuid`; Prisma note → Prisma 7 config model | Tasks 2, 3 |
| database-standards.md | UUID Strategy | "`cuid`/`uuid`" → "**`uuid` — UUID v7**; not CUID/auto-inc/UUIDv4" | Task 2 |
| gym-saas-adr-v1.md | Principle 8 | "(cuid/uuid)" → "(**UUID v7**)" | Task 2 |
| schema.prisma | whole file | UUIDv7 + `@db.Uuid`; Prisma 7 datasource/generator; removed the 6 bucket-3 fields | Tasks 2, 3, 4 |
| prisma.config.ts | new | Prisma 7 connection config | Task 3 |
| decision-log.md | new | **ADR-026** (UUID v7) + **ADR-027** (Prisma 7) appended | Tasks 2, 3 |
| schema.prisma + DDS §4 | Member indexes | **R-1 applied**: `(gym_id,status,full_name)` replaces `(gym_id,status)`+`(gym_id,full_name)` | ratification 2026-06-25 |
| schema.prisma + DDS §16 | AuditLog / seed | `metadata` → nullable (F-1); reserved **system-actor** User seeded (F-2) | ratification 2026-06-25 |

---

## 8. Verdict (this review)

The schema is a **faithful, validated, MVP-scoped** translation of the DDS: zero accidental deviations, zero forbidden constructs, all gaps are Missing-by-design and carried to the migration. Proceed to the migration specification and integrity test plan. Final cross-artifact verdict is in `database-readiness-report.md`.
