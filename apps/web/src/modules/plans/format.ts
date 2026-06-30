import { DURATION_UNITS } from "./validation";

type DurationUnit = (typeof DURATION_UNITS)[number];

const UNIT_LABEL: Record<DurationUnit, string> = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
};

/** Human duration label: (1, "MONTH") → "1 month"; (3, "MONTH") → "3 months". */
export function formatDuration(value: number, unit: DurationUnit): string {
  const noun = UNIT_LABEL[unit];
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}
