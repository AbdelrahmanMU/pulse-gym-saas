import { PaymentEntryType, PaymentStanding } from "@pulse/db";

/**
 * Payment ledger derivation (Sprint-1 Epic-5) — the pure, testable core of Billing, mirroring
 * the membership `lifecycle.ts` engine. Outstanding Balance, Total Paid and Payment Standing are
 * **always derived from the immutable Payment ledger**, never stored (DDS §1.6/§8). No I/O, no
 * `lib/money` business policy, and **never a float**: every value is exact integer minor units
 * (`bigint`).
 *
 * Total paid is a **signed sum over the ledger** — `Σ(PAYMENT.amount) − Σ(VOID.amount)`. A VOID
 * entry carries the same positive magnitude as the payment it reverses (and a payment is voidable
 * at most once — `@@unique([voidsPaymentId])`), so the sum nets a voided payment to zero without
 * needing to resolve which row voided which.
 */

/** The minimal ledger fact the derivation needs: an entry's effect (by type) and magnitude. */
export interface LedgerEntry {
  entryType: PaymentEntryType;
  /** Positive magnitude in minor units (DDS: amount > 0; effect is carried by `entryType`). */
  amountMinor: bigint;
}

export interface LedgerSummary {
  /** The membership's snapshot price (amount due) in minor units. */
  priceMinor: bigint;
  /** Σ(PAYMENT) − Σ(VOID) in minor units. */
  totalPaidMinor: bigint;
  /** `price − totalPaid`; **negative when overpaid** (informational, never clamped here). */
  remainingMinor: bigint;
  standing: PaymentStanding;
}

/** Net of the ledger: signed-sum total paid, remaining balance, and derived standing. */
export function summarizeLedger(
  priceMinor: bigint,
  entries: readonly LedgerEntry[],
): LedgerSummary {
  let totalPaidMinor = 0n;
  for (const entry of entries) {
    if (entry.entryType === PaymentEntryType.PAYMENT) totalPaidMinor += entry.amountMinor;
    else if (entry.entryType === PaymentEntryType.VOID) totalPaidMinor -= entry.amountMinor;
  }
  return {
    priceMinor,
    totalPaidMinor,
    remainingMinor: priceMinor - totalPaidMinor,
    standing: deriveStanding(priceMinor, totalPaidMinor),
  };
}

/**
 * Derive Payment Standing from price + total paid. Order matters (advisor): `paid ≥ price → PAID`
 * comes first so a **zero-price** membership (Plan price CHECK is `>= 0`) and an **overpayment**
 * both read PAID; then `paid ≤ 0 → PENDING` (a brand-new or fully-voided membership); otherwise
 * PARTIALLY_PAID. Standing is informational and **never** controls Membership Status (independent).
 */
export function deriveStanding(priceMinor: bigint, totalPaidMinor: bigint): PaymentStanding {
  if (totalPaidMinor >= priceMinor) return PaymentStanding.PAID;
  if (totalPaidMinor <= 0n) return PaymentStanding.PENDING;
  return PaymentStanding.PARTIALLY_PAID;
}
