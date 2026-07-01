import { summarizeLedger, type LedgerEntry } from "./ledger";

/**
 * Revenue bucketing (Epic-6 dashboard) — pure, exact, and reuses the ledger's **single sign
 * authority** (`summarizeLedger`): net revenue for a period is `Σ(PAYMENT) − Σ(VOID)` over the
 * entries whose `receivedOn` (gym-tz calendar day, `YYYY-MM-DD`) falls in `[fromIso, toIso]`
 * inclusive. No new money math, never a float. A void (dated at void time) reduces its period and
 * can net negative — correct for a cash-flow view.
 */
export interface DatedLedgerEntry extends LedgerEntry {
  /** The entry's revenue-basis day as `YYYY-MM-DD` (gym tz). */
  receivedOn: string;
}

/** Net revenue (minor units) over entries with `fromIso ≤ receivedOn ≤ toIso`. ISO dates sort lexically. */
export function sumRevenueInRange(
  entries: readonly DatedLedgerEntry[],
  fromIso: string,
  toIso: string,
): bigint {
  const inRange = entries.filter((e) => e.receivedOn >= fromIso && e.receivedOn <= toIso);
  return summarizeLedger(0n, inRange).totalPaidMinor;
}
