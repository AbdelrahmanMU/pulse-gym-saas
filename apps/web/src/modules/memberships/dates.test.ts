import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dayDiff,
  fromDbDate,
  inclusiveEndDate,
  isAfter,
  isBefore,
  maxDate,
  toDbDate,
} from "./dates";

/**
 * Membership date math (time-rules T-2..T-9) — the conventions that, if they drift, silently
 * expire a membership a day early or mis-extend a freeze. The high-risk edges: month-end
 * clamping (Jan 31 + 1mo), leap February, the **inclusive** end day, and lossless DB
 * round-tripping. One helper backs remaining-days, expiring-soon, renewal-start, and
 * frozen-days, so these tests guard all of them.
 */
describe("addDays", () => {
  it("adds and subtracts whole calendar days across a month boundary", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-06-15", 0)).toBe("2026-06-15");
  });
});

describe("addMonths (end-of-month clamping)", () => {
  it("clamps Jan 31 + 1 month to Feb 28 in a common year (never overflows to March)", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("clamps to Feb 29 in a leap year", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
  });

  it("rolls the year and keeps the day when valid", () => {
    expect(addMonths("2026-11-15", 2)).toBe("2027-01-15");
    expect(addMonths("2026-03-31", 1)).toBe("2026-04-30");
  });
});

describe("dayDiff", () => {
  it("counts whole days, signed", () => {
    expect(dayDiff("2026-01-01", "2026-01-08")).toBe(7);
    expect(dayDiff("2026-01-08", "2026-01-08")).toBe(0);
    expect(dayDiff("2026-01-08", "2026-01-01")).toBe(-7);
  });
});

describe("inclusiveEndDate (T-3 — end day is inclusive)", () => {
  it("a 1-day plan ends on its start day", () => {
    expect(inclusiveEndDate("2026-01-15", 1, "DAY")).toBe("2026-01-15");
  });

  it("a 7-day plan spans 7 inclusive days", () => {
    expect(inclusiveEndDate("2026-01-15", 7, "DAY")).toBe("2026-01-21");
  });

  it("a 1-week plan ends 6 days later (inclusive)", () => {
    expect(inclusiveEndDate("2026-01-15", 1, "WEEK")).toBe("2026-01-21");
  });

  it("a 1-month plan from Jan 15 ends Feb 14 (inclusive)", () => {
    expect(inclusiveEndDate("2026-01-15", 1, "MONTH")).toBe("2026-02-14");
  });

  it("a 1-month plan from Jan 31 clamps then takes the inclusive day (Feb 27)", () => {
    expect(inclusiveEndDate("2026-01-31", 1, "MONTH")).toBe("2026-02-27");
  });
});

describe("comparisons & max", () => {
  it("orders dates and picks the later", () => {
    expect(isBefore("2026-01-01", "2026-01-02")).toBe(true);
    expect(isAfter("2026-01-02", "2026-01-01")).toBe(true);
    expect(maxDate("2026-01-01", "2026-06-01")).toBe("2026-06-01");
    expect(maxDate("2026-06-01", "2026-01-01")).toBe("2026-06-01");
  });
});

describe("DB round-trip", () => {
  it("converts to a midnight-UTC Date and back losslessly", () => {
    const iso = "2026-02-29".replace("2026", "2024"); // a real leap day
    expect(fromDbDate(toDbDate(iso))).toBe(iso);
    expect(toDbDate("2026-06-15").toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });
});
