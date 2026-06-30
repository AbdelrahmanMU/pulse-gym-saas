# Sprint 1 · Epic 5 — Payments & Outstanding Balances · Implementation Brief

> One-page brief. Completes the financial side of the Membership Lifecycle. Payments belong to **Memberships**, never directly to Members. Reuses the existing immutable Payment ledger (DDS §2.15), `lib/money`, the authorization catalog, and the Design System. No schema change.

## What ships (one vertical slice: `modules/payments/`)

1. **Record Payment** — against a membership: amount, payment date, method, optional note. Creates an immutable `Payment` row (`entryType = PAYMENT`). Currency + branch are **inherited from the membership snapshot**, never from input.
2. **Payment History** — chronological ledger on the membership detail page: date, amount, method, recorder, note, and a **running total**. Voided payments render struck + marked; the void entry renders as a reversal.
3. **Outstanding Balance** — Price / Total Paid / Remaining, all **derived** from immutable payments, never stored.
4. **Payment Standing** — `PENDING / PARTIALLY_PAID / PAID`, **derived**; surfaced as a badge. Never touches Membership Status.
5. **Void Payment** — creates a `VOID` entry referencing the original (`voidsPaymentId`). Never edits/deletes. A payment is voided at most once (`@@unique([voidsPaymentId])`).

## Architecture (mirrors Epic 4)

- **`ledger.ts` — pure derivation core** (the testable heart, like `lifecycle.ts`). `summarizeLedger(priceMinor, entries)` → `{ totalPaid, remaining, standing }` using **signed bigint sum**: `totalPaid = Σ(PAYMENT) − Σ(VOID)`. No I/O, no float, fully unit-tested.
- **`service.ts`** — mutation pipeline `authorize(permission) → validate(Zod) → scope(gymId/assertSameGym) → execute → (revalidate in action)`. Injectable `IClock` (T-26/27; no `new Date()`).
- **`validation.ts`** (Zod, `z.infer` types), **`queries.ts`** (RSC reads), **`actions.ts`** (`"use server"` wrappers), **`format.ts` / `ui/*`** (catalogued components + tokens only).
- Cross-module: the **memberships** detail page calls `payments` public queries — public functions only, no internals.

## Authorization (already in the catalog — no change)

`payments.read` (view), `payments.record` (record), `payments.void` (void). Owner holds all; Front Desk = read+record; Manager/Accountant = read+record+void. Each guarded action has the permission asserted in the service; UI shows controls **by permission**.

## Money correctness (sacred)

- All arithmetic in **integer minor units (`bigint`)**; `lib/money` is the single parse/format authority. `parseAmountToMinor` rejects over-precision; an explicit `minor > 0n` check returns a **field error** before the DB `CHECK (amount > 0)` can throw.
- `Payment.currency` = membership `snapshotCurrency` (write-path cross-table rule, DDS §2.15).
- **Standing order pins price 0 / overpay:** `paid ≥ price → PAID` (subsumes free memberships & overpayment) → `paid ≤ 0 → PENDING` (guards a fully-voided membership) → else `PARTIALLY_PAID`.
- **Void write-path guards:** target must be `entryType = PAYMENT` (can't void a void), same-gym, not already voided; `amount`/`currency` copied from the target; the unique constraint is the double-void backstop (P2002 → friendly "already voided").

## Decisions & interpretation flags (per constitution §13 — surfaced, not silently chosen)

- **F1 — "Never derive financial values outside `lib/money`":** `lib/money`'s own docstring scopes it to *mechanics only — no business policy/revenue*. Standing/balance are business policy, so they live in `ledger.ts` (bigint, exact), using `lib/money` only for parse/format. This matches the `plans`/`memberships` precedent (money policy in the module, mechanics in `lib/money`). Both authorities cited; reviewer should confirm the reading.
- **F2 — Recording is allowed on a membership in any status** (incl. EXPIRED/CANCELLED). Blocking would couple payment to status, which the brief forbids ("completely independent"). Outstanding balances can be collected after a period ends. Explicit assumption.
- **D1 — `receivedAt` (revenue-period basis):** stored at **noon-UTC of the gym-tz payment date** (default = today in gym tz, optional back-date). Day-granular, deterministic, avoids tz day-shift on display. History is ordered by `recordedAt asc` (true append order) so a void always follows its payment; the displayed date is `receivedAt`.
- **No audit-log writes.** No module writes `AuditLog` yet (Epics 1–4 don't); introducing it now would be a new pattern without approval. Deferred, consistent with the codebase.

## Explicit deferred tech debt (NOT in this Epic)

Membership-level trainer assignment · freeze-reason persistence · cancel-reason persistence · membership-notes persistence · refunds/discounts/coupons/taxes/installments/online-payments/receipts/invoices/accounting/multi-currency (all out of scope).
