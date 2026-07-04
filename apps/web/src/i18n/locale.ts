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

/**
 * The single source of the active locale for a request.
 *
 * The Localization Authority (Deliverable 13 §4) models locale as a **gym setting**
 * (GYM-2, per-gym). At one-gym MVP scale (GYM-4) "the gym's locale" and "one
 * configured locale" are the same value, so today this returns {@link DEFAULT_LOCALE}
 * with no schema change. When multi-gym / a locale selector lands, **only this
 * function changes** (read it from the session's gym settings) — no translated string
 * moves, no call site changes.
 *
 * NOTE (flagged for the implementation report): GYM-2 does not yet carry a `locale`
 * column; wiring the literal gym-setting model is a future Prisma migration, kept out
 * of this presentation-only sprint deliberately.
 */
export async function getUserLocale(): Promise<Locale> {
  return DEFAULT_LOCALE;
}

/** Writing direction for the document root. Arabic is right-to-left. */
export function dirForLocale(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
