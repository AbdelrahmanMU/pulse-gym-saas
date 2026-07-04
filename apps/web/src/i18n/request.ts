import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, SOURCE_LOCALE, getUserLocale, type Locale } from "./locale";

/**
 * next-intl request configuration — **"without i18n routing"** mode (no `/ar` `/en`
 * path segments; the Authority explicitly defers a v1 language switcher). The active
 * locale comes from {@link getUserLocale}; messages are loaded per-locale and layered
 * over the English source so any not-yet-translated key falls back to English rather
 * than rendering a raw key (Authority · Deliverable 13 §7 fallback strategy).
 *
 * Digit discipline: the Authority mandates **Latin (Western) digits everywhere**.
 * ICU number/plural placeholders under the `ar` locale would render Arabic-Indic
 * digits, so `formats.number` pins the `latn` numbering system, and message authors
 * pass already-formatted Latin numeric strings for display values (never a bare `#`).
 */
type Messages = Record<string, unknown>;

async function loadMessages(locale: Locale): Promise<Messages> {
  return (await import(`../../messages/${locale}.json`)).default;
}

const isObject = (v: unknown): v is Messages =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Deep-overlay `active` onto `source` so every missing leaf falls back to English. */
function deepMerge(source: Messages, active: Messages): Messages {
  const out: Messages = { ...source };
  for (const [key, value] of Object.entries(active)) {
    const base = out[key];
    out[key] = isObject(base) && isObject(value) ? deepMerge(base, value) : value;
  }
  return out;
}

export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  const source = await loadMessages(SOURCE_LOCALE);
  // English source underneath the active locale → missing keys fall back to English.
  const messages =
    locale === SOURCE_LOCALE ? source : deepMerge(source, await loadMessages(locale));

  return {
    locale,
    defaultLocale: DEFAULT_LOCALE,
    messages,
    formats: {
      number: {
        // Force Latin digits regardless of locale (Authority · Deliverable 9).
        integer: { maximumFractionDigits: 0, numberingSystem: "latn" },
        decimal: { numberingSystem: "latn" },
      },
    },
    // Missing keys fall back to the English source via the deep merge above. A key
    // absent in BOTH catalogs uses next-intl's default handling (logs in dev, renders
    // the key path) so real gaps stay loud during the incremental rollout.
  };
});
