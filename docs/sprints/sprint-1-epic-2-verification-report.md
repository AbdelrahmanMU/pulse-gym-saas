# Sprint 1 · Epic 2 — Verification Report

| | |
|---|---|
| **Epic** | Sprint 1 · Epic 2 — Member Management (Fast Delivery Mode). |
| **Branch** | `feat/platform-foundation` (not merged/tagged). |
| **Platform** | `v1.0.0-sprint-0`; no schema/migration change (Member entities + all raw-SQL constraints already shipped). |
| **Brief** | `sprint-1-epic-2-member-management-brief.md`. |

## Scope delivered
Add · Edit · Archive · Reactivate · Search · Status & Trainer filters · Member Details · Assign Responsible Trainer. **OUT (confirmed untouched):** Memberships, Plans, Payments, Renewals, Freeze, Expiry, member-Notes UI.

## Gates — all green (commands run from `apps/web`)
| Gate | Command | Result |
|---|---|---|
| Types | `npm run type-check` | ✅ pass |
| Lint + architectural fitness | `npm run lint` · `npm run test` | ✅ ESLint clean; **79** unit/fitness pass (incl. graph: no cycles, no ui→db, no cross-context; no role-checks; no hardcoded permission keys) |
| Unit (Member validation) | `npm run test` | ✅ **11** new tests |
| Integration P0 (real DB) | `npm run test:integration` | ✅ **20** Member tests pass + **2** `it.todo`; 38 integration total |
| Production build | `npm run build` | ✅ 4 Member routes compile (all dynamic) |

## P0 coverage (the gates that must bite)
- **Tenant isolation (INV-1/2):** list returns only the actor's gym; cross-gym member update → **404, never 403**; cross-gym trainer target → 404.
- **Permission, never role (INV-5):** allow **and** deny proven for `members.read/create/update/archive`, `assignments.manage` — by toggling the principal's permission set; the fitness suite proves no role-name branching exists.
- **Member contract:** INV-9 (name + at-least-one-contact) at the Zod boundary **and** the DB `CHECK`; INV-3 (contact unique per gym) → Prisma `P2002` mapped to an inline field error; same contact allowed in a different gym (per-tenant).
- **Archive/reactivate (ARC-1/2):** sets/clears `status` + `archivedAt`; the partial-unique recycles a contact on archive, and reactivation that would collide with a new active holder is surfaced as an error (not a 500).
- **Trainer assignment (INV-35/36):** assign → reassign keeps **exactly one** open assignment (atomic close+open); unassign closes it; target must be an **active GymUser in the same gym**.
- **Filters:** status partitions ACTIVE/ARCHIVED/ALL; trainer partitions by assigned id vs UNASSIGNED.

## Deferred, by design (tracked, not skipped)
- **ARC-3 / INV-11** archive preconditions (no Active/Scheduled membership; no Outstanding Balance) are **`it.todo`** and a documented `assertArchivable` seam. Both are vacuously satisfied in this epic (Memberships/Payments uncreatable); duplicating the balance derivation (INV-24) here would violate single ownership. **Wire in Epic D.**

## Decisions requiring human acceptance
1. **Responsible-trainer eligibility = any *active* staff member (GymUser), owners included.** Restricting to a "Trainer role" would be role-branching (INV-5); assignment is informational (ASN-2). The action is gated by `assignments.manage`. **If the business wants trainers-only, that needs a new data concept (an "assignable as trainer" flag), not a role check — flagging for veto.**
2. **First catalog data components** (`StatusBadge`, `DataTable`, `Pagination`) were implemented here, minimal and to-spec (no selection/bulk/density/sort-UI yet).

## Known limitations (non-blocking; see Retrospective)
- Concurrent `assignTrainer` races rely on the DB partial-unique as the backstop (second writer would 500 rather than retry) — Epic-D cleanup.
- Toolbar: an unsubmitted search term is dropped when a filter select changes (minor UX).

> Per Fast Delivery Mode, work stops here for human acceptance.
