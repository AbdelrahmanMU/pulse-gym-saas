import { describe, expect, it } from "vitest";
import { PaymentEntryType, PaymentStanding } from "@pulse/db";
import { deriveStanding, summarizeLedger, type LedgerEntry } from "./ledger";

/**
 * Payment ledger derivation (Epic-5) — P0 business invariants: money math is exact (bigint, never
 * float), balance/standing are derived from the immutable ledger, and a VOID nets its payment to
 * zero. The crux cases (advisor): a **zero-price** membership reads PAID, an **overpayment** reads
 * PAID, and a **fully-voided** membership falls back to PENDING.
 */
const pay = (amountMinor: bigint): LedgerEntry => ({
  entryType: PaymentEntryType.PAYMENT,
  amountMinor,
});
const voidOf = (amountMinor: bigint): LedgerEntry => ({
  entryType: PaymentEntryType.VOID,
  amountMinor,
});

describe("summarizeLedger — totals", () => {
  it("is fully unpaid (PENDING) with no entries", () => {
    const s = summarizeLedger(10000n, []);
    expect(s.totalPaidMinor).toBe(0n);
    expect(s.remainingMinor).toBe(10000n);
    expect(s.standing).toBe(PaymentStanding.PENDING);
  });

  it("sums multiple payments exactly (no float drift)", () => {
    // 0.01 + 0.02 — the classic float trap (0.1+0.2); bigint is exact.
    const s = summarizeLedger(100n, [pay(1n), pay(2n)]);
    expect(s.totalPaidMinor).toBe(3n);
    expect(s.remainingMinor).toBe(97n);
    expect(s.standing).toBe(PaymentStanding.PARTIALLY_PAID);
  });

  it("is PAID when payments exactly meet the price", () => {
    const s = summarizeLedger(10000n, [pay(4000n), pay(6000n)]);
    expect(s.totalPaidMinor).toBe(10000n);
    expect(s.remainingMinor).toBe(0n);
    expect(s.standing).toBe(PaymentStanding.PAID);
  });

  it("nets a voided payment back out of the total (signed sum)", () => {
    const s = summarizeLedger(10000n, [pay(4000n), pay(6000n), voidOf(6000n)]);
    expect(s.totalPaidMinor).toBe(4000n);
    expect(s.remainingMinor).toBe(6000n);
    expect(s.standing).toBe(PaymentStanding.PARTIALLY_PAID);
  });

  it("falls back to PENDING when every payment has been voided", () => {
    const s = summarizeLedger(10000n, [pay(10000n), voidOf(10000n)]);
    expect(s.totalPaidMinor).toBe(0n);
    expect(s.remainingMinor).toBe(10000n);
    expect(s.standing).toBe(PaymentStanding.PENDING);
  });
});

describe("deriveStanding — boundary cases", () => {
  it("treats a zero-price membership as PAID even with no payments", () => {
    expect(deriveStanding(0n, 0n)).toBe(PaymentStanding.PAID);
  });

  it("treats an overpayment as PAID (remaining goes negative, informational only)", () => {
    const s = summarizeLedger(10000n, [pay(12000n)]);
    expect(s.remainingMinor).toBe(-2000n);
    expect(s.standing).toBe(PaymentStanding.PAID);
  });

  it("is PENDING at exactly zero paid against a positive price", () => {
    expect(deriveStanding(5000n, 0n)).toBe(PaymentStanding.PENDING);
  });

  it("is PARTIALLY_PAID strictly between zero and price", () => {
    expect(deriveStanding(5000n, 1n)).toBe(PaymentStanding.PARTIALLY_PAID);
    expect(deriveStanding(5000n, 4999n)).toBe(PaymentStanding.PARTIALLY_PAID);
  });

  it("is PAID at exactly the price", () => {
    expect(deriveStanding(5000n, 5000n)).toBe(PaymentStanding.PAID);
  });
});
