import "server-only";
import { cookies } from "next/headers";

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

/** The configured default when neither a user choice nor an env override is present. */
export const DEFAULT_LOCALE: Locale = "ar";

/** Cookie holding the signed-in user's chosen locale (the language switcher writes it). */
export const LOCALE_COOKIE = "pulse-locale";

function asLocale(value: string | undefined): Locale | null {
  return value === "en" || value === "ar" ? value : null;
}

/**
 * The single source of the active locale for a request. Resolution order (first wins):
 *
 *   1. **the user's `pulse-locale` cookie** — set by the in-app language switcher; a
 *      per-user, per-device preference (the per-user override the Authority · Deliverable
 *      13 §4 anticipated as a "future addition", now shipped without i18n routing);
 *   2. **the `PULSE_LOCALE` env var** — how the functional e2e pins `en` (keeping the
 *      English assertions valid) and how the `ar` RTL verification runs the app in Arabic;
 *   3. **{@link DEFAULT_LOCALE}** — the product default (`ar`).
 *
 * Cookie-first is deliberate: the switcher must win over the env/default, while e2e (env=en,
 * no cookie) and the RTL scripts (env=ar, no cookie) still resolve exactly as before.
 *
 * NOTE (flagged for the report): a *per-gym* locale (GYM-2) is still a future Prisma
 * migration; this ships the per-user selector only. The Authority D13 §4 deferral of the
 * v1 switcher is superseded by the explicit human request to build it — a follow-up
 * amendment to that document is recommended (out of this sprint's frozen-doc scope).
 */
export async function getUserLocale(): Promise<Locale> {
  const fromCookie = asLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return fromCookie ?? asLocale(process.env.PULSE_LOCALE) ?? DEFAULT_LOCALE;
}

/** Writing direction for the document root. Arabic is right-to-left. */
export function dirForLocale(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
