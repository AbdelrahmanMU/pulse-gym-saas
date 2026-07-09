# Sprint 1 · Epic 2 — Retrospective (Member Management)

**Outcome:** the first business CRUD slice landed clean in Fast Delivery Mode — no architectural conflict, no missing business rule, no ADR, no DB-foundation change. The Epic-1 mutation-pipeline pattern (explicit-`principal` service core + thin actions/queries) ported with zero friction, which is the whole point of the constitution's "one obvious way."

## What went well
- **The frozen foundation paid off.** Member entities and every raw-SQL invariant (INV-3 partial-uniques, INV-9 CHECK, INV-35 trainer partial-unique, trigram) were already in the init migration — so the P0 tests enforce *real* constraints, not accidental passes. Verifying the migration **before** writing tests (not after) was the highest-leverage step.
- **DB-as-enforcer, app-as-translator.** Contact uniqueness lives in one place (the partial-unique); the app just maps `P2002` → a field error. No duplicated rule, no drift.
- **The deferred-but-loud pattern for ARC-3.** An empty `assertArchivable` seam + `it.todo` tests naming both preconditions keeps the invariant visible and Epic-D-ready without duplicating money logic that has no owner yet.

## What was tricky / judgment calls
- **Trainer eligibility vs. the no-role-branching rule.** "Assign to a trainer" reads role-shaped, but INV-5 forbids it. Resolved to "any active staff," gated by `assignments.manage` — surfaced for human veto rather than inventing an "is-trainer" concept.
- **Catalog components that existed only on paper.** The list needed the canonical `DataTable`/`StatusBadge`/`Pagination`. Built minimal and to-spec rather than bespoke — but this is the seam where "the design system is frozen" meets "components aren't all implemented yet." Worth an explicit call as more list features arrive.

## Caught in review (not by self-checks) — worth internalizing
- **`notesSummary` was written but never collected** → every edit would have nulled it once the Notes epic populated it. Lesson: a column that a form *writes* but doesn't *render* is a latent data-loss bug; the safe move for out-of-scope columns is to not touch them in `toData` at all.
- **"Filters" shipped compiling but unasserted.** Search-by-name was tested; status/trainer partitioning (the riskier query logic) was not, until review forced two quick tests. Lesson: every scope bullet deserves at least one assertion, especially the ones with branchy query predicates.

## Carry into Epic D
- Wire the two ARC-3 preconditions into `archiveMember` when membership-state + balance queries exist.
- Serialize/guard `assignTrainer` against the concurrent-insert race (P2002 → 500 today).
- Add the GymUser-revoke side of INV-36 (clear/reassign a removed trainer's open assignments) when Staff Management (Epic A2) lands.
