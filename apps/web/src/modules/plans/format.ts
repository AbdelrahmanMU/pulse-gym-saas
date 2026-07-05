import { DURATION_UNITS } from "./validation";

type DurationUnit = (typeof DURATION_UNITS)[number];

const UNIT_LABEL: Record<DurationUnit, string> = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
};

// Arabic count-noun forms [singular · dual · plural(3–10) · accusative(11+)] — the natural
// Egyptian/Gulf duration phrasing the Localization Authority mandates (D9): «شهر · شهران · 3 أشهر
// · 12 شهرًا». Latin digits throughout.
const AR_UNIT: Record<DurationUnit, readonly [string, string, string, string]> = {
  DAY: ["يوم", "يومان", "أيام", "يومًا"],
  WEEK: ["أسبوع", "أسبوعان", "أسابيع", "أسبوعًا"],
  MONTH: ["شهر", "شهران", "أشهر", "شهرًا"],
};

/**
 * Human duration label: (1, "MONTH") → "1 month" / «شهر»; (3, "MONTH") → "3 months" / «3 أشهر».
 * Locale-aware (Authority D9) — English format preserved when `locale` is absent or non-Arabic.
 */
export function formatDuration(value: number, unit: DurationUnit, locale?: string): string {
  if (locale?.toLowerCase().startsWith("ar")) {
    const [one, two, few, many] = AR_UNIT[unit];
    if (value === 1) return one;
    if (value === 2) return two;
    if (value >= 3 && value <= 10) return `${value} ${few}`;
    return `${value} ${many}`;
  }
  const noun = UNIT_LABEL[unit];
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}
