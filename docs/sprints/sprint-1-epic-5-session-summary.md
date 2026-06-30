# Sprint 1 · Epic 5 — Payments & Outstanding Balances · Session Summary

> Brief: `sprint-1-epic-5-implementation-brief.md`. This is the **verification report + retrospective**. Scope, decisions, and interpretation flags live in the brief (a fact lives in one place).

## What shipped

One vertical slice — `apps/web/src/modules/payments/`:

| File | Role |
|---|---|
| `ledger.ts` | Pure derivation core: signed-sum total paid, remaining balance, standing. No I/O, no float. |
| `ledger.test.ts` | 10 P0 business-invariant tests (incl. price 0 → PAID, overpay → PAID, fully-voided → PENDING). |
| `validation.ts` | Zod `RecordPaymentSchema` / `VoidPaymentSchema`; client-safe method vocabulary. |
| `validation.test.ts` | 7 input-boundary tests. |
| `service.ts` | Mutation pipeline — `recordPayment`, `voidPayment`, `getMembershipBilling`. |
| `queries.ts` / `actions.ts` | RSC read + `"use server"` wrappers. |
| `format.ts` | Method labels (client-safe). |
| `ui/` | `payment-standing-badge`, `payment-summary`, `payment-history`, `record-payment-form`, `void-payment-control`, `form-state`. |

Wired into the membership detail page (`/memberships/[membershipId]`) as **Billing** + **Payment history** sections, each gated by permission. No schema change, no migration.

## Verification Report

**Payment Recording** — `recordPayment` creates an immutable `Payment` (`entryType=PAYMENT`). Currency + branch inherited from the membership snapshot (never input). Amount parsed to exact minor units via `lib/money`; `> 0` enforced as a field error before the DB `CHECK`. Gated by `payments.record`.

**Outstanding Balance** — Price / Total Paid / Remaining all derived in `ledger.summarizeLedger` from the immutable ledger; nothing is stored. Remaining can go negative (overpayment) and renders as "Credit". Verified by `ledger.test.ts` (exact bigint sums; the `0.01+0.02` float-trap case is exact).

**Payment Standing** — derived (`PENDING / PARTIALLY_PAID / PAID`), order pins price 0 and overpay to PAID and a fully-voided membership back to PENDING. Surfaced as a badge; **never** written and **never** touches Membership Status (independent — verified by the standing tests and by the absence of any membership write in the payments service).

**Immutable Ledger** — no UPDATE/DELETE code path on `Payment`. Corrections are new rows. `getMembershipBilling` is read-only. Append-only honored (no `updated_at`, no soft-delete).

**Void Payment** — `voidPayment` appends a `VOID` entry referencing the original (`voidsPaymentId`), copying magnitude + currency from the target. Guards: target must be a `PAYMENT` (can't void a void), same-gym (`assertSameGym` → 404), not already voided; `@@unique([voidsPaymentId])` is the concurrent-double-void backstop (P2002 → friendly message). Gated by `payments.void`. The signed sum nets a voided payment to zero.

**Authorization** — every guarded function asserts a permission (`payments.read` / `.record` / `.void`) in the service; the page shows controls by permission via `hasPermission`. No role branching (T-27 fitness rule green). Catalog already grants these to Owner / Front Desk / Manager / Accountant — `catalog-consistency.test.ts` green.

**Architecture Fitness** — `fitness/architecture.test.ts` green: no cycles, no package→app, no ui→db, no cross-context imports. Cross-module access (membership page → payments) is via the module's public `queries`/`service` surface only. Client bundle does **not** pull the server-only `@pulse/db` (the record form imports a client-safe method vocabulary; build verified).

**Money Precision** — all arithmetic in integer minor units (`bigint`); `lib/money` is the single parse/format authority; over-precision rejected; no float anywhere in the path. `lib/money.test.ts` + `ledger.test.ts` green.

**Database Invariants** — `amount > 0` (Zod + DB CHECK), currency = membership snapshot currency (write-path), branch inherited, `voidsPaymentId` unique. Payments belong to a Membership (never a Member). No invariant relaxed.

**Gates:** type-check ✅ · lint ✅ · prettier ✅ · build ✅ · tests **140 passed (21 files)** ✅.

## Product Demo Checklist

1. **Record first payment** — open a membership → Billing → Record payment (amount, method, date). Standing flips PENDING → PARTIALLY_PAID (or PAID if full); Total Paid + Remaining update.
2. **Record partial payment** — amount < remaining → standing PARTIALLY_PAID; running total climbs in history.
3. **Record final payment** — brings Total Paid ≥ price → standing PAID; Remaining = 0.
4. **Verify Outstanding Balance** — Price / Total Paid / Remaining match the ledger exactly.
5. **Verify Payment Standing** — badge matches the derived value (incl. a zero-price plan → PAID with no payment).
6. **Void a payment** — expand "Void…" on a payment row → confirm. A VOID entry appears; the original renders struck "Voided".
7. **Verify immutable history** — the original payment row remains; nothing edited/deleted; the void is an added reversal.
8. **Verify Membership Status unchanged** — record/void any amount; the membership status badge and lifecycle controls are unaffected.

## Retrospective (≤5)

- **Ledger-as-pure-core paid off again.** Mirroring `lifecycle.ts` made the money invariants unit-testable with zero DB; the price-0 / overpay / fully-voided edge cases were cheap to pin and caught by design, not by accident.
- **Server-only `@pulse/db` leaked into the client bundle** through the method-enum import — caught by `next build`, not type-check/lint. Fixed by mirroring the `DURATION_UNITS` string-literal pattern; worth a fitness test so it fails faster next time.
- **`receivedAt` (Timestamptz) from a calendar-day input** needed a deciding rule; noon-UTC-of-gym-tz-day is deterministic and tz-safe, with `recordedAt` carrying the true instant. Documented as a decision, not a silent choice.
- **Two interpretation flags surfaced, not guessed** (lib/money scope vs. the brief's wording; recording allowed in any membership status) — both resolved by citing existing precedent + the constitution, per §13.
- **No DB integration test for the service** — consistent with Epics 1–4 (pure-core + validation tests; tenancy/authz covered by `assertSameGym`/`authorize` unit tests). A seeded integration harness remains the standing sprint-level gap.
