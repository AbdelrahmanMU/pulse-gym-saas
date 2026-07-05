/**
 * Money mechanics (money-rules M-1) — pure, currency-aware conversion between a user's
 * major-unit string (e.g. "29.99") and exact **integer minor units** (`bigint`, e.g.
 * `2999n`), plus display formatting. **Money is never a float** (ADR-009): parsing is a
 * string→digit operation, and the only float appears at the final presentation step where
 * money-rules §3 explicitly permits display rounding.
 *
 * This module holds **mechanics only** — no business policy (amount-due, rounding strategy,
 * revenue) lives here. The number of minor digits per currency comes from the runtime's
 * Intl data (ISO-4217), never a hardcoded table to drift.
 */

/** Minor-unit digits for a currency (USD→2, JPY→0, BHD→3). Throws on an unknown code. */
export function currencyFractionDigits(currency: string): number {
  // `maximumFractionDigits` is typed optional but is always present for `style: "currency"`;
  // the `?? 2` is an unreachable safety net to satisfy the type.
  return (
    new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

/**
 * Parse a user-entered major-unit string into exact minor units. Accepts only a plain,
 * unseparated non-negative decimal (`^\d+(\.\d+)?$` — no grouping separators, no sign).
 * **Over-precision is rejected, never rounded** (money-rules §3): "29.999" on a 2-digit
 * currency throws. Throws {@link RangeError} on any invalid input.
 */
export function parseAmountToMinor(input: string, currency: string): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new RangeError(`Not a valid amount: ${input}`);
  }
  const fractionDigits = currencyFractionDigits(currency);
  const [whole, fraction = ""] = trimmed.split(".");
  if (fraction.length > fractionDigits) {
    throw new RangeError(`Too many decimal places for ${currency} (max ${fractionDigits})`);
  }
  // Fraction pads to the RIGHT: "100.5" with 2 digits → "100" + "50" = 10050, never 10005.
  const minor = `${whole}${fraction.padEnd(fractionDigits, "0")}`;
  return BigInt(minor);
}

/** Format minor units to a plain major-unit string ("2999" USD → "29.99") — for input
 *  default values and round-tripping. No symbol, no grouping. */
export function formatMinorPlain(minor: bigint, currency: string): string {
  const fractionDigits = currencyFractionDigits(currency);
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString();
  if (fractionDigits === 0) return `${negative ? "-" : ""}${digits}`;
  const padded = digits.padStart(fractionDigits + 1, "0");
  const whole = padded.slice(0, -fractionDigits);
  const fraction = padded.slice(-fractionDigits);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/**
 * Product-decided Arabic currency marks (Localization Authority · Deliverable 9). These are a
 * deliberate presentation choice — the mark sits **after** the amount with a space («400 ج.م») —
 * that `Intl` cannot reproduce in this form (it emits «٤٠٠ ج.م.‏» with Arabic-Indic digits and a
 * different placement). This is a small, closed, human-ruled table (not the fraction-digit data
 * this module otherwise refuses to hardcode); an unknown code falls back to the ISO code.
 */
const ARABIC_CURRENCY_MARK: Record<string, string> = {
  EGP: "ج.م",
  SAR: "ر.س",
  AED: "د.إ",
  KWD: "د.ك",
  JOD: "د.أ",
};

const isArabicLocale = (locale?: string): boolean =>
  locale?.toLowerCase().startsWith("ar") ?? false;

/** Group a Latin integer digit string with "," every three from the right ("1200" → "1,200"). */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Arabic money presentation (Authority · Deliverable 9): Latin digits, "," thousands separator,
 * the currency mark after the amount, and **whole amounts render without decimals** («1,200 ج.م»)
 * while fractional amounts keep them («400.50 ج.م»). The whole-vs-fraction test stays in `bigint`
 * space — the module's never-float invariant holds; no `Number()` conversion happens here.
 */
function formatArabicCurrency(minor: bigint, currency: string, fractionDigits: number): string {
  const mark = ARABIC_CURRENCY_MARK[currency] ?? currency;
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const base = 10n ** BigInt(fractionDigits);
  const whole = groupThousands((abs / base).toString());
  const remainder = abs % base;
  const amount =
    fractionDigits > 0 && remainder !== 0n
      ? `${whole}.${remainder.toString().padStart(fractionDigits, "0")}`
      : whole;
  return `${negative ? "-" : ""}${amount} ${mark}`;
}

/** Format minor units to a localized currency string ("2999" USD → "$29.99"). Display-only
 *  (the Number conversion is presentation rounding, money-rules §3); never written back. Under an
 *  Arabic locale it renders the Authority presentation (mark after the amount, Latin digits). */
export function formatMinorCurrency(minor: bigint, currency: string, locale?: string): string {
  const fractionDigits = currencyFractionDigits(currency);
  if (isArabicLocale(locale)) return formatArabicCurrency(minor, currency, fractionDigits);
  const major = Number(minor) / 10 ** fractionDigits;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(major);
}

/** The currency's display symbol for an input prefix ("USD" → "$"); falls back to the code. Under
 *  an Arabic locale it returns the Authority currency mark («EGP» → «ج.م»). */
export function currencySymbol(currency: string, locale?: string): string {
  if (isArabicLocale(locale)) return ARABIC_CURRENCY_MARK[currency] ?? currency;
  const parts = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}
