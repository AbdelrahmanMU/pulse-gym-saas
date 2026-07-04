import "server-only";

/**
 * The set of locales PULSE ships. `ar` (Modern Standard Arabic, Egyptian business
 * register) is the product's primary language per the Arabic Localization Authority
 * (`docs/localization/arabic-localization-authority.md`, accepted 2026-07-05). `en`
 * is the source language and the fallback (Authority · Deliverable 13 §7).
 */
export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Source language and fallback when a key is missing in the active locale. */
export const SOURCE_LOCALE: Locale = "en";

/** The configured default until a per-gym / per-user selector ships. */
export const DEFAULT_LOCALE: Locale = "ar";

function asLocale(value: string | undefined): Locale | null {
  return value === "en" || value === "ar" ? value : null;
}

/**
 * The single source of the active locale for a request.
 *
 * The Localization Authority (Deliverable 13 §4) models locale as a **gym setting**
 * (GYM-2, per-gym). At one-gym MVP scale (GYM-4) "the gym's locale" and "one
 * configured locale" are the same value, so today this resolves to {@link DEFAULT_LOCALE}
 * with no schema change. When multi-gym / a locale selector lands, **only this
 * function changes** (read it from the session's gym settings) — no translated string
 * moves, no call site changes.
 *
 * The `PULSE_LOCALE` env var is an optional override: it is how the functional e2e/test
 * environment pins `en` (keeping the existing English assertions valid) and how the `ar`
 * RTL verification runs the app in Arabic — without a cookie read, so pages keep their
 * static/dynamic rendering unchanged (locale is process-level today, not per-request).
 *
 * NOTE (flagged for the implementation report): GYM-2 does not yet carry a `locale`
 * column; wiring the literal gym-setting model is a future Prisma migration, kept out
 * of this presentation-only sprint deliberately.
 */
export async function getUserLocale(): Promise<Locale> {
  return asLocale(process.env.PULSE_LOCALE) ?? DEFAULT_LOCALE;
}

/** Writing direction for the document root. Arabic is right-to-left. */
export function dirForLocale(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
