import type { IClock, IIdGenerator } from "@pulse/types";

/**
 * Deterministic platform-adapter fakes for tests (T-26 DoD: "injectable fakes usable
 * in tests"). They let domain logic be exercised with a fixed time and a predictable
 * id sequence instead of the real system clock / random id generator.
 */

/** A clock frozen at `fixed`. `today(tz)` formats that instant in the given tz. */
export function createFakeClock(fixed: Date): IClock {
  return {
    now: () => fixed,
    today: (timeZone: string): string =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(fixed),
  };
}

/** An id generator returning `prefix` + an incrementing counter (e.g. `id-1`). */
export function createFakeIdGenerator(prefix = "id-"): IIdGenerator {
  let counter = 0;
  return {
    newId: (): string => {
      counter += 1;
      return `${prefix}${counter}`;
    },
  };
}
