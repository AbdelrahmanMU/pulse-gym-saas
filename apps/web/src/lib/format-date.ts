/**
 * Date presentation — pure, locale-aware formatting for the `<time>` text child (the machine
 * value stays in `dateTime`, an ISO string — design-system §D9 / Localization Authority · D9).
 * Mirrors `lib/money`: mechanics only, no business policy, locale threaded in from the caller.
 *
 * Under Arabic it renders **day · month-name · year with no leading zero and Latin digits**
 * («30 أغسطس 2026») using the Egyptian/Gulf month names the Authority mandates in *all* markets
 * (يناير…، never the Levantine كانون/شباط). Under any other locale it reproduces the existing
 * English format per `form`, byte-for-byte, so the English-pinned test suite stays valid.
 *
 * Dates are calendar days stored UTC (constitution §7); every component is read in UTC so the
 * rendered day matches the stored `dateTime` in every timezone.
 */
const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

/**
 * `full` = «30 أغسطس 2026» / "Aug 30, 2026" · `short` = «30 أغسطس» / "Aug 30" (date ranges) ·
 * `monthYear` = «يناير 2026» / "January 2026" (since-joined) · `iso` = «30 أغسطس 2026» / "2026-08-30"
 * (list columns that render the machine value in English — Arabic still gets the month-name form).
 */
export type DateForm = "full" | "short" | "monthYear" | "iso";

const EN_FULL = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const EN_SHORT = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const EN_MONTH_YEAR = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const isArabicLocale = (locale?: string): boolean =>
  locale?.toLowerCase().startsWith("ar") ?? false;

/** UTC calendar parts from a `Date` or an ISO date/date-time string. */
function utcParts(value: Date | string): { year: number; month: number; day: number; date: Date } {
  const date =
    typeof value === "string"
      ? new Date(value.length === 10 ? `${value}T00:00:00Z` : value)
      : value;
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    date,
  };
}

/** The machine value for `<time dateTime>` — an ISO `YYYY-MM-DD` calendar day. */
export function toISODate(value: Date | string): string {
  if (typeof value === "string") return value.length === 10 ? value : value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

/** Localized `<time>` text for a calendar day. See {@link DateForm} for the per-form output. */
export function formatDate(value: Date | string, locale: string, form: DateForm = "full"): string {
  const { year, month, day, date } = utcParts(value);
  if (isArabicLocale(locale)) {
    const name = ARABIC_MONTHS[month];
    if (form === "short") return `${day} ${name}`;
    if (form === "monthYear") return `${name} ${year}`;
    return `${day} ${name} ${year}`; // full + iso both render the Arabic month-name form
  }
  if (form === "iso") return toISODate(value);
  if (form === "short") return EN_SHORT.format(date);
  if (form === "monthYear") return EN_MONTH_YEAR.format(date);
  return EN_FULL.format(date);
}
