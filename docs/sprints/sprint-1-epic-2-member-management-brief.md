# Sprint 1 · Epic 2 — Member Management (Implementation Brief)

| | |
|---|---|
| **Mode** | Fast Delivery. One-page brief; no long planning docs. |
| **Platform** | Frozen `v1.0.0-sprint-0`; built on Epic 1 patterns (`modules/gym`). |
| **Scope (IN)** | Add · Edit · Archive · Reactivate · Search · Filters · Member Details · Assign Responsible Trainer. |
| **Scope (OUT)** | Memberships, Plans, Payments, Renewals, Freeze, Expiry, Notes UI. |
| **Source rules** | MBR-1/2/3/5, ARC-1/2/3, ASN-1/2/3, TRN-3, PRM-1/2/3; INV-1/2/3/5/8/9/10/11/35/36/40. |

## Decisions (no STOP required — all resolvable from the ranked docs)

1. **Trainer eligibility = any *active* `GymUser` in the gym.** Restricting to a "Trainer role" would be role-branching (INV-5); assignment is informational, never a permission boundary (ASN-2). The *action* is gated by `assignments.manage`; the picklist is filtered to `status = ACTIVE` (INV-36 + tenancy). *Semantics flagged for human veto at acceptance: owners are selectable too.*
2. **Archive guard (ARC-3 / INV-11): the membership + outstanding-balance preconditions are DEFERRED, loudly.** Both are vacuously satisfied today (Memberships/Payments are OUT and uncreatable). We do **not** query membership counts or derive balances now — balance is money-derivation logic (INV-24) with no owning module yet, and duplicating it would violate the no-duplicated-logic rule. `archiveMember` carries an `assertArchivable` seam; the two deferred preconditions are recorded as `it.todo` tests and wired in Epic D.
3. **First catalog data components are born here.** The Member list legitimately needs the canonical table, so this epic introduces minimal, catalog-conformant `StatusBadge`, `DataTable`, and `Pagination` (Catalog §DataTable/§Pagination/§StatusBadge). **Skip** selection/bulk-bar/density-toggle/MemberCard/sort-UI until a story needs them (no speculative architecture). Status is shown via `*-text` token + icon + label, never colour alone (§3).
4. **Search/filter is server-side via URL params** (`?q=&status=&trainer=&page=`); RSC reads them and queries. `contains`/`ilike` on `full_name` (+ phone/email) — the trigram GIN index already exists (init migration §8) but is perf, not correctness.

## Constraints honoured
- **No schema/migration change** — `Member`, `MemberNote`, `TrainerAssignment` and all raw-SQL constraints (partial-uniques INV-3, `CHECK` INV-9, trainer partial-unique INV-35, trigram) already shipped in the init migration. Never run `migrate dev` (it re-proposes dropping the hand-authored trigram index).
- **Mutation pipeline**: authenticate → authorize *by permission* → validate (Zod) → scope (`gymId` from session) → execute → revalidate. Service core takes an explicit `principal` (testable); thin `"use server"` actions + RSC queries resolve it.
- **DB-enforced invariants surfaced as field errors**: Prisma `P2002` on `(gym_id, phone|email)` → inline field error (create, edit, **and reactivate** — the partial-unique frees a contact on archive, so reactivate can collide). INV-9 is a cross-field Zod `.refine()` backed by the DB `CHECK`.
- **Trainer reassignment is one transaction**: close the open row (`unassignedAt`) + insert the new row together (INV-35 partial-unique). Timestamps via injected `IClock` (no raw `new Date()` in `modules/**`).
- Catalog components + tokens only; permission keys from `@pulse/auth` constants only.

## Permissions
`members.read` (list/search/detail) · `members.create` · `members.update` · `members.archive` · `members.reactivate` · `assignments.read` (show current trainer) · `assignments.manage` (assign/reassign/unassign + trainer picklist).

## Deliverables
`modules/members/{validation,service,actions,queries}.ts` + `ui/*` · shared `components/pulse/{status-badge,data-table,pagination}.tsx` · routes `(app)/members/{page, new, [memberId], [memberId]/edit}` · nav wired (Members gated by `members.read`, placeholder removed) · unit `validation.test.ts` + integration P0 `tests/integration/members.test.ts` · Verification Report + Retrospective.
