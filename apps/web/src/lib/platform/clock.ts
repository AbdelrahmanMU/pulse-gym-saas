import type { IClock } from "@pulse/types";

/**
 * System {@link IClock} (T-26) — the real time source. Domain code depends on
 * `IClock`, never `Date.now()` directly (T-27 fitness rule), so time is injectable
 * and deterministic in tests. `today()` judges the date in the gym's IANA time zone
 * (time-rules), not the server's.
 */
export const systemClock: IClock = {
  now: () => new Date(),
  today: (timeZone: string): string =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
};
