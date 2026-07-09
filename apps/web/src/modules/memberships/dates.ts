import type { DurationUnit } from "@pulse/db";

/**
 * Membership date math (time-rules T-2..T-9) — pure, calendar-day arithmetic on
 * **`YYYY-MM-DD` gym-time-zone strings** (never raw instants). The membership module
 * reasons in whole business days; a `Date` appears only at the `@db.Date` boundary
 * (`toDbDate`/`fromDbDate`). The **end day is inclusive** (T-3): a period's exclusive
 * end is `start + duration`, and the stored inclusive end is the day before that.
 *
 * This is the single home for the conventions (inclusive end, end-of-month clamping,
 * day diffs) so remaining-days, the expiring-soon window, renewal start, and
 * frozen-days-on-resume can never drift apart.
 */

/** A `YYYY-MM-DD` calendar day in the gym time zone. */
export type IsoDate = string;

const MS_PER_DAY = 86_400_000;

/** Parse a `YYYY-MM-DD` to its UTC-midnight instant (safe for pure date arithmetic). */
function toUtc(date: IsoDate): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

/** Format a UTC instant back to its `YYYY-MM-DD` calendar day. */
function fmt(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Add (or subtract) whole calendar days to a gym-tz date. */
export function addDays(date: IsoDate, days: number): IsoDate {
  return fmt(toUtc(date) + days * MS_PER_DAY);
}

/**
 * Add whole calendar months, **clamping to the last valid day** of the target month
 * (Jan 31 + 1mo → Feb 28/29, never an overflow into March). Years roll naturally.
 */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = new Date(toUtc(date));
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + months;
  const day = d.getUTCDate();
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  // Day 0 of the *next* month is the last day of the target month — the clamp ceiling.
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return fmt(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
}

/** Whole calendar days from `from` to `to` (`to − from`); negative when `to` precedes `from`. */
export function dayDiff(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);
}

/** `a < b` for gym-tz dates. */
export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return toUtc(a) < toUtc(b);
}

/** `a > b` for gym-tz dates. */
export function isAfter(a: IsoDate, b: IsoDate): boolean {
  return toUtc(a) > toUtc(b);
}

/** The later of two gym-tz dates (used for the renewal start: later of today / day-after-end). */
export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return isAfter(a, b) ? a : b;
}

/**
 * The **inclusive** end day of a period that starts on `start` and lasts `value` of
 * `unit` (T-3/T-6). Exclusive end = start + duration; inclusive end = the day before.
 *   • 1 DAY from Jan-15 → Jan-15 (access through that day; Expired Jan-16).
 *   • 1 MONTH from Jan-15 → Feb-14.   • 1 MONTH from Jan-31 → Feb-27 (clamped).
 */
export function inclusiveEndDate(start: IsoDate, value: number, unit: DurationUnit): IsoDate {
  const exclusiveEnd =
    unit === "MONTH" ? addMonths(start, value) : addDays(start, value * (unit === "WEEK" ? 7 : 1));
  return addDays(exclusiveEnd, -1);
}

/** A gym-tz `YYYY-MM-DD` → the midnight-UTC `Date` stored in a `@db.Date` column. */
export function toDbDate(date: IsoDate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** A `@db.Date` value read from Prisma → its `YYYY-MM-DD` calendar day. */
export function fromDbDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}
