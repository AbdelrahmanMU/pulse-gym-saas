import { describe, expect, it } from "vitest";
import { formatDate, toISODate } from "./format-date";

/**
 * Date presentation (Localization Authority · D9). English output is byte-for-byte the existing
 * format per form (the English-pinned suite depends on it); Arabic is day · month-name · year with
 * Latin digits and no leading zero, using the Egyptian/Gulf month names in every market.
 */
describe("formatDate — Arabic", () => {
  it("renders day · month-name · year with Latin digits", () => {
    expect(formatDate("2026-08-30", "ar", "full")).toBe("30 أغسطس 2026");
    expect(formatDate("2026-01-05", "ar", "full")).toBe("5 يناير 2026");
  });

  it("short = day · month; monthYear = month · year; iso still gets the month-name form", () => {
    expect(formatDate("2026-06-01", "ar", "short")).toBe("1 يونيو");
    expect(formatDate("2026-01-10", "ar", "monthYear")).toBe("يناير 2026");
    expect(formatDate("2026-08-30", "ar", "iso")).toBe("30 أغسطس 2026");
  });
});

describe("formatDate — English (source format preserved)", () => {
  it("reproduces the existing per-form English output", () => {
    expect(formatDate("2026-08-30", "en", "full")).toBe("Aug 30, 2026");
    expect(formatDate("2026-08-30", "en", "short")).toBe("Aug 30");
    expect(formatDate("2026-01-10", "en", "monthYear")).toBe("January 2026");
    expect(formatDate("2026-08-30", "en", "iso")).toBe("2026-08-30");
  });

  it("reads a Date in UTC", () => {
    expect(formatDate(new Date("2026-08-30T23:30:00Z"), "en", "iso")).toBe("2026-08-30");
    expect(formatDate(new Date("2026-08-30T23:30:00Z"), "ar", "full")).toBe("30 أغسطس 2026");
  });
});

describe("toISODate", () => {
  it("returns the calendar day for strings and Dates", () => {
    expect(toISODate("2026-08-30")).toBe("2026-08-30");
    expect(toISODate(new Date("2026-08-30T23:30:00Z"))).toBe("2026-08-30");
  });
});
