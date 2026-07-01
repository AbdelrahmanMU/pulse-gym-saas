import { describe, expect, it } from "vitest";
import { PaymentEntryType } from "@pulse/db";
import { startOfIsoWeek, sumRevenueInRange, type DatedLedgerEntry } from "./revenue";

/**
 * Revenue bucketing (Epic-6). Net = Σ(PAYMENT) − Σ(VOID) over the inclusive gym-tz day range;
 * exact bigint, reuses the ledger sign authority. Pins the range boundaries and void reversal.
 */
const pay = (receivedOn: string, amountMinor: bigint): DatedLedgerEntry => ({
  entryType: PaymentEntryType.PAYMENT,
  amountMinor,
  receivedOn,
});
const voidOf = (receivedOn: string, amountMinor: bigint): DatedLedgerEntry => ({
  entryType: PaymentEntryType.VOID,
  amountMinor,
  receivedOn,
});

const ENTRIES: DatedLedgerEntry[] = [
  pay("2026-06-30", 5000n), // previous day
  pay("2026-07-01", 3000n), // today
  pay("2026-07-01", 2000n), // today
  pay("2026-07-15", 9000n), // later this month
  voidOf("2026-07-15", 9000n), // reverses the same-day payment
];

describe("sumRevenueInRange", () => {
  it("sums a single day inclusively", () => {
    expect(sumRevenueInRange(ENTRIES, "2026-07-01", "2026-07-01")).toBe(5000n);
  });

  it("nets a void out of its period", () => {
    // 2026-07-15: +9000 −9000 = 0
    expect(sumRevenueInRange(ENTRIES, "2026-07-15", "2026-07-15")).toBe(0n);
  });

  it("sums a whole month across days (void included)", () => {
    // July: 3000 + 2000 + 9000 − 9000 = 5000 (June 30 excluded)
    expect(sumRevenueInRange(ENTRIES, "2026-07-01", "2026-07-31")).toBe(5000n);
  });

  it("excludes entries outside the range", () => {
    expect(sumRevenueInRange(ENTRIES, "2026-06-01", "2026-06-30")).toBe(5000n);
  });

  it("is zero over an empty range", () => {
    expect(sumRevenueInRange(ENTRIES, "2026-08-01", "2026-08-31")).toBe(0n);
  });

  it("can net negative when a void lands in a period with no matching payment", () => {
    const entries = [voidOf("2026-07-02", 1000n)];
    expect(sumRevenueInRange(entries, "2026-07-01", "2026-07-31")).toBe(-1000n);
  });
});

describe("startOfIsoWeek — Monday-start ISO week (Epic-8 revenue report)", () => {
  it("returns the same day when it is already a Monday", () => {
    expect(startOfIsoWeek("2026-01-05")).toBe("2026-01-05"); // 2026-01-05 is a Monday
  });

  it("returns the week's Monday for a midweek day", () => {
    expect(startOfIsoWeek("2026-01-07")).toBe("2026-01-05"); // Wednesday → Monday
  });

  it("treats Sunday as the last day of its ISO week (not the first)", () => {
    expect(startOfIsoWeek("2026-01-11")).toBe("2026-01-05"); // Sunday → the preceding Monday
  });

  it("crosses the month/year boundary correctly", () => {
    expect(startOfIsoWeek("2026-01-01")).toBe("2025-12-29"); // Thursday → Monday in the prior year
  });
});
