# Sprint 1 · Epic 3 — Verification Report

| | |
|---|---|
| **Epic** | Sprint 1 · Epic 3 — Membership Plans (Fast Delivery Mode). |
| **Branch** | `feat/platform-foundation` (not merged/tagged). |
| **Platform** | `v1.0.0-sprint-0`; no schema/migration change (Plan + its CHECK/index already shipped). |
| **Brief** | `sprint-1-epic-3-membership-plans-brief.md`. |

## Scope delivered
Create · Edit · Archive · Restore · View · Search plans. Each plan: name, duration (value + unit), price, optional description, Active/Archived status. **OUT (confirmed untouched):** membership creation, payments, discounts, promotions, taxes, proration, auto-renew, session packages, attendance, PT scheduling.

## Gates — all green (commands run from `apps/web`)
| Gate | Command | Result |
|---|---|---|
| Types | `npm run type-check` | ✅ pass |
| Lint + architectural fitness | `npm run lint` · `npm run test` | ✅ ESLint clean; fitness green (no cycles/ui→db/cross-context; no role-checks; no hardcoded permission keys; no raw `Date`) |
| Unit | `npm run test` | ✅ **95** total (+16: plan validation + `lib/money` mechanics) |
| Integration P0 (real DB) | `npm run test:integration` | ✅ **12** Plan tests; 50 integration total (+2 todo carried from Epic 2) |
| Production build | `npm run build` | ✅ 4 Plan routes compile (all dynamic) |

## P0 coverage (the gates that must bite)
- **Money correctness (M-1):** a plan created from `"29.99"` is stored as exactly `2999n` minor units in the gym's currency (snapshotted) — the end-to-end exact-money proof. `lib/money` unit tests prove right-padded fractions (`"100.5"`/USD→`10050`), per-currency precision (JPY 0-dp, BHD 3-dp), **rejection (never rounding) of over-precision** (`"29.999"`→error), grouping/sign rejection, and lossless round-trip.
- **Tenant isolation (INV-1/2):** list returns only the actor's gym; cross-gym plan update → **404, never 403**.
- **Permission, never role (INV-5):** allow **and** deny proven for `plans.read/create/update/deactivate` by toggling the principal's permission set; fitness suite proves no role-name branching.
- **Plan contract:** non-positive duration rejected (DB `CHECK` backstops); over-precise price rejected as a field error.
- **Lifecycle (PLN-2):** archive sets `isActive=false`, restore sets it `true`; both gated by `plans.deactivate`.
- **Filters:** status partitions ACTIVE/ARCHIVED/ALL; search matches name/description.

## Decisions requiring human acceptance
1. **"Active / Archived" status is backed by `Plan.isActive`** (PLN-2 active⇄inactive/retired; the canonical domain term is "inactive/retired"). `Plan.archivedAt` is left untouched, reserved for a future true soft-delete. **If the business wants a separate archive distinct from deactivate, that's a future column-level decision — flagging.**
2. **Restore (un-archive) was added** as the minimal inverse of Archive (not in the listed actions, but "Active/Archived status" implies a two-way toggle, and `plans.deactivate` already covers both directions). **Flagging for veto.**
3. **Plan currency = the gym's default currency**, snapshotted at create and **unchanged on edit** (multi-currency is out of scope, money-rules §1). Editing price keeps the plan's original currency.
4. **First money/long-text catalog components** (`MetricValue`, `CurrencyInput`, `TextArea`) and `lib/money.ts` were implemented here, minimal and to-spec. `CurrencyInput` submits the major-unit string with the **server as the single parse authority** (a deliberate, documented deviation from the catalog's `value(minor)` prop, safer for the form-action flow).

## Known limitations (non-blocking)
- `CurrencyInput` does not reformat/group on blur (minimal); it sanitizes to digits + one decimal point and the server is authoritative.
- Plans-toolbar drops an unsubmitted search term when the status select changes (minor UX, same as Members).

> Per Fast Delivery Mode, work stops here. **Epic 4 is not begun.**
