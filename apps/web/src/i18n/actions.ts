"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALES, type Locale } from "./locale";

/**
 * Persist the signed-in user's language choice (the in-app switcher). Writes the
 * `pulse-locale` cookie that {@link getUserLocale} reads first; the client calls
 * `router.refresh()` afterwards so the current route re-renders in the new locale with the
 * URL and session preserved (no i18n routing, no navigation). Presentation-only: this
 * changes no domain data and touches no schema.
 */
export async function setLocaleAction(locale: Locale): Promise<void> {
  if (!LOCALES.includes(locale)) return; // never trust client input
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // one year
    sameSite: "lax",
    httpOnly: true, // the locale is read server-side; the client reads it via next-intl's provider
  });
}
