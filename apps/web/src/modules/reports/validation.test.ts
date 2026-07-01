import { describe, expect, it } from "vitest";
import { parseRevenueRange } from "./validation";

/**
 * Revenue custom-range parsing (Epic-8). Invalid or partial input must degrade to `null` (the report
 * still renders its standard buckets) — never throw at the page.
 */
describe("parseRevenueRange", () => {
  it("accepts a valid ordered range", () => {
    expect(parseRevenueRange("2026-01-01", "2026-01-31")).toEqual({
      fromIso: "2026-01-01",
      toIso: "2026-01-31",
    });
  });

  it("accepts an equal from/to (single day)", () => {
    expect(parseRevenueRange("2026-02-10", "2026-02-10")).toEqual({
      fromIso: "2026-02-10",
      toIso: "2026-02-10",
    });
  });

  it("rejects an inverted range (from after to)", () => {
    expect(parseRevenueRange("2026-02-01", "2026-01-01")).toBeNull();
  });

  it("rejects a non-calendar date", () => {
    expect(parseRevenueRange("2026-13-01", "2026-01-31")).toBeNull();
    expect(parseRevenueRange("not-a-date", "2026-01-31")).toBeNull();
  });

  it("treats a partial or empty range as no range", () => {
    expect(parseRevenueRange("2026-01-01", undefined)).toBeNull();
    expect(parseRevenueRange(undefined, "2026-01-31")).toBeNull();
    expect(parseRevenueRange(undefined, undefined)).toBeNull();
  });
});
