# Identifier Strategy
### PULSE Gym SaaS · Primary-key & foreign-key identifier standard

| | |
|---|---|
| **Status** | ✅ Authoritative — the project identifier standard (finalized 2026-06-25) |
| **Standard** | **UUID version 7** (RFC 9562), stored as native Postgres `uuid` |
| **Supersedes** | the earlier "UUID v7 **or** CUID2" option in DDS §16 — now **UUID v7 only** |
| **Honors** | DDS §1.1/§16, database-standards (non-sequential, opaque, non-guessable), ADR principle 8 |

> **Decision.** Every primary key and every foreign key in the schema is a **UUID v7**. **Not used:** CUID, CUID2, auto-increment/serial integers, or random UUID v4 (v4 only if a specific column ever has a hard technical reason — none today).

---

## 1. Why UUID v7 (and why not the alternatives)

UUID v7 is a 128-bit identifier whose **leading 48 bits are a Unix-millisecond timestamp**, followed by random bits. It is globally unique and non-guessable like a v4, but **time-ordered** like a sequence — giving us the security properties the constitution requires *without* the write-amplification of random keys.

| Candidate | Verdict | Reason |
|---|---|---|
| **UUID v7** | ✅ **Chosen** | Time-ordered (index locality + natural sort) **and** non-sequential/non-guessable (tenant safety). Native Postgres `uuid` type. RFC-standard, cross-language. |
| Auto-increment / `serial`/`bigserial` | ❌ Rejected | Guessable & enumerable across tenants (security/IDOR risk); leaks row counts and creation order; not merge/replication-safe; collides on multi-writer/sharded futures. Violates database-standards "non-sequential" + INV non-guessable IDs. |
| Random **UUID v4** | ❌ Rejected (default) | Non-guessable but **fully random** → terrible B-tree insert locality (random page splits, cache churn, index bloat) on high-volume append-only tables (Payment, AuditLog, Membership). Allowed only if a column has an unavoidable technical need. |
| **CUID / CUID2** | ❌ Rejected | Not a database-native type (stored as `text`/`char` → larger keys, slower joins, no `uuid` operator class). CUID2 is deliberately **not sortable** (anti-enumeration by design), losing the index-locality benefit. Not an ISO/RFC standard; weaker cross-language/tooling support than `uuid`. |

### 1.1 Concrete benefits for PULSE

- **Index locality.** New rows on the heaviest tables (Payment, AuditLog, Membership — append-only, "grows fastest" per DDS §7) carry monotonically increasing key prefixes, so inserts append to the **right edge** of the primary-key B-tree instead of scattering. This minimizes page splits, keeps the hot index pages in cache, and curbs index bloat — directly protecting the DDS §7 growth profile (100M+ payments at enterprise scale).
- **Sorting.** "Newest first" on `id` approximates creation order without a separate sort key, and range scans by time-prefixed id are cheaper. (We still store explicit `created_at`/`received_at`/`occurred_at` as the **business** time source of truth — ids are not a substitute for those.)
- **Scalability.** Time-ordered keys reduce write contention on the PK index, which matters most exactly where DDS §7 predicts the largest volumes and where partitioning (Payment/AuditLog/Membership by `gym_id`/time) is a future candidate.
- **Distributed systems.** UUID v7 is generated **without coordination** — no central sequence, no round-trip — so multi-writer, multi-region, offline/edge generation, and future read-replica/sharded topologies all produce collision-free, mergeable keys.
- **Future integrations.** Public API, mobile clients, data exports, and event payloads can mint and reference ids client-side; ids are opaque and safe to expose (non-enumerable), satisfying api-standards and the "opaque id" rule.
- **Cross-language compatibility.** `uuid` is a first-class type in Postgres and in every major language/driver (TS/JS, Python, Java, Go, .NET, Rust). No bespoke library is required to parse, compare, or store an id, unlike CUID.

---

## 2. PostgreSQL implementation

- **Column type:** native **`uuid`** (16 bytes) on every PK and FK — never `text`/`varchar`. Smaller than a text id, supported by the `uuid_ops` B-tree operator class, and required for the `btree_gist` exclusion constraint to combine with `member_id` on Membership (INV-13).
- **Generation (primary):** application/ORM-side via Prisma (`uuid(7)`) — see §3.
- **Generation (defense-in-depth, optional):** the project targets **PostgreSQL 18**, which ships a native **`uuidv7()`** function. For rows inserted **outside** Prisma (manual SQL, bulk loads, future services), add a column default in the migration:
  ```sql
  ALTER TABLE <t> ALTER COLUMN id SET DEFAULT uuidv7();
  ```
  This is optional and additive; the Prisma client default already covers all ORM writes. (On < PG18, use the `pg_uuidv7` extension or rely solely on the Prisma default.)
- **No meaning in ids.** Ids are opaque; never parse the timestamp prefix for business logic (use `created_at`). *Privacy note:* a v7 id reveals an approximate creation time — acceptable here (we already store `created_at`); do not use v7 where creation-time disclosure is sensitive (none in this domain).

---

## 3. Prisma implementation

```prisma
model Example {
  id      String @id @default(uuid(7)) @db.Uuid
  gymId   String @map("gym_id") @db.Uuid   // every FK scalar is uuid too
  // ...
  gym     Gym    @relation(fields: [gymId], references: [id], onDelete: Restrict)
}
```

- **`@default(uuid(7))`** — Prisma generates a UUID v7 at create time (supported in Prisma 6.x+ and retained in Prisma 7).
- **`@db.Uuid`** — maps the column to native Postgres `uuid`. **Mandatory on every FK scalar**, because Postgres requires both sides of a foreign key to share a type; a `text` FK pointing at a `uuid` PK fails at migration time. The schema carries `@db.Uuid` on all **17** ids and all **47** FK scalars (verified: every `@db.Uuid` annotation sits on an id or FK scalar).
- **Polymorphic ids:** `AuditLog.target_id` is `@db.Uuid` (it holds entity ids) but is **not** a relation (the target is `target_type` + `target_id`).
- **Interop:** Prisma exposes `uuid` columns as `string` in TypeScript — no `BigInt`-style serialization friction.

---

## 4. Migration & rollout notes
- All ids are `uuid` from the **initial** migration — there is no integer→uuid backfill to perform (greenfield).
- Seed data (permissions, capabilities, roles, the bootstrap gym/branch/owner) uses UUID v7 ids generated by Prisma or `uuidv7()`.
- Do **not** mix id strategies across tables; uniformity is what makes ids predictable for the AI and safe for joins.

*This document is the single source of truth for the identifier decision; other docs cite it rather than restating the rationale.*
