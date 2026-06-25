# Database Standards
### PULSE Gym SaaS · Engineering Governance

| | |
|---|---|
| **Status** | ✅ Authoritative |
| **References** | ADR §7 (multi-tenancy), §9 (DB principles), §11 (Prisma), `naming-conventions.md` |

> **Why these standards:** The database is the least reversible part of the system and the place where tenancy and money correctness are ultimately enforced. Rigid, boring schema rules protect both for years and let the AI evolve the schema safely.

---

## Schema Organization
- **Single `prisma/schema.prisma`** = the one source of truth (ADR §11). *Why:* one place to read the whole model; the AI never hunts.
- **Models grouped by module** with comment banners (Members, Plans, Memberships, Payments…). *Why:* mirrors the feature-sliced code.
- **Seed (`prisma/seed.ts`)** deterministically creates the MVP gym, branch, and owner. *Why:* reproducible local/test state.

## Naming Conventions
- **Tables:** snake_case **plural** (`members`, `gym_users`). **Models:** PascalCase **singular** mapped via `@@map`. **Columns:** snake_case; **Prisma fields** camelCase via `@map`. (Full table in `naming-conventions.md`.) *Why:* SQL idiom in the DB, TS idiom in code, no ambiguity.

## Multi-Tenancy Rules (Iron Laws — ADR §7)
1. **Every business table has `gym_id`** (FK → `gyms`). No business entity is global. *Why:* row-level tenant isolation is the security model.
2. **`gym_id` is indexed on every business table** (and is the lead column of most composite indexes). *Why:* every query filters by it.
3. **Every query filters by `gymId`** from the session — never from client input. Cross-tenant access returns not-found. *Why:* prevents data leakage (the #1 SaaS risk).
4. **Uniqueness is per-tenant:** unique constraints include `gym_id` (e.g., unique member phone is `@@unique([gym_id, phone])`). *Why:* two gyms may legitimately share a phone number.

## Branch Rules
- **`branch_id` exists from migration #1** (FK → `branches`), optional/defaulted in the single-branch MVP. *Why:* multi-branch activates with no schema rewrite (ADR §18).
- **Branch is a finer scope *within* a gym**, never a substitute for `gym_id`. Both columns coexist. *Why:* the tenant boundary is the gym; branch is sub-scoping.

## UUID Strategy
- **Primary keys are non-sequential `uuid` — specifically UUID v7** (project standard, finalized 2026-06-25; **not** CUID/CUID2, auto-increment ints, or random UUIDv4). *Why:* IDs aren't guessable/enumerable across tenants (security), are merge/replication-safe, and UUIDv7's time-ordered prefix preserves B-tree index locality. Canonical rationale: `/docs/database/identifier-strategy.md`.
- **IDs are opaque;** never encode meaning into them. *Why:* stable, leak-free.

## Audit Fields
- **Every table:** `created_at` (default now), `updated_at` (auto-updated). **Records with lifecycle:** `created_by`/`updated_by` (user id) where it aids audit. *Why:* who/when is needed for support, audit logging, and trust.
- **Timestamps stored in UTC**; interpreted in the gym timezone at read (ADR §9). *Why:* correct "today"/expiry regardless of server location.

## Soft-Delete Policy
- **People and historical/financial records are soft-deleted** (`status`/`archived_at`), never hard-deleted: members, memberships, payments, notes. *Why:* history and revenue must be preserved (ADR §9).
- **Default queries exclude archived;** an explicit filter includes them. *Why:* clean active lists without losing data.
- **Hard delete** is allowed only for truly transient rows (e.g., expired sessions). *Why:* nothing with meaning is ever destroyed.

## Snapshot / Immutability
- **Memberships and Payments snapshot** the plan name, price, and duration at transaction time. Editing a Plan later **never** alters existing memberships/payments. *Why:* historical revenue and contracts must not be rewritten (ADR §9.3).
- **Money** stored as **integer minor units or `Decimal`** with a currency code — **never floats.** *Why:* float rounding corrupts financial data.

## Indexes
- **Index every `gym_id`**, every foreign key, and the columns behind common filters/sorts (status, dates, search fields). *Why:* tenancy + list views must stay fast as data grows.
- **Composite indexes lead with `gym_id`** then the filtered/sorted column. *Why:* matches the always-scoped query shape.
- **Add indexes deliberately** based on real query patterns; don't over-index. *Why:* every index taxes writes.

## Foreign Keys & Cascade Rules
- **Explicit foreign keys** on all relations. *Why:* the DB is the last line of integrity defense.
- **Cascade policy by intent:**
  - **Restrict/soft-delete** for entities with history (don't cascade-delete a Member's payments). *Why:* preserve financial history.
  - **Cascade** only for truly owned, meaningless-alone children (e.g., a draft's items). *Why:* avoid orphans without destroying records that matter.
- **A Plan referenced by any membership cannot be hard-deleted** — deactivate instead (ADR §11). *Why:* protects historical references.

## Migration Strategy
- **Prisma Migrate only**, forward-only, committed to the repo. `migrate dev` locally, `migrate deploy` in prod (ADR §11). *Why:* every schema change is reviewed, versioned, reproducible.
- **Never edit the database by hand;** never edit a shipped migration. *Why:* drift between environments is untraceable.
- **Migrations are reviewed like code** and called out in the feature spec (§5). Destructive migrations (drops, type changes) require explicit human approval and a backout note. *Why:* schema changes are the highest-risk change.
- **Backfills are separate, idempotent steps**, not hidden in a schema migration. *Why:* data and structure changes have different risk profiles.
