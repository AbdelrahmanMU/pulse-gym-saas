import { describe, expect, it } from "vitest";
import {
  currencyFractionDigits,
  currencySymbol,
  formatMinorCurrency,
  formatMinorPlain,
  parseAmountToMinor,
} from "./money";

/**
 * Money mechanics (money-rules M-1, ADR-009) — the exact-conversion guarantees that keep
 * money sacred: right-padded fractions, currency-aware precision, rejection (never rounding)
 * of over-precise input, and lossless round-tripping. These cover the failure modes that
 * compile silently.
 */
describe("currencyFractionDigits", () => {
  it("reflects each currency's real minor-unit digits", () => {
    expect(currencyFractionDigits("USD")).toBe(2);
    expect(currencyFractionDigits("JPY")).toBe(0);
    expect(currencyFractionDigits("BHD")).toBe(3);
  });
});

describe("parseAmountToMinor", () => {
  it("pads the fraction to the RIGHT (100.5 USD → 10050, never 10005)", () => {
    expect(parseAmountToMinor("100.5", "USD")).toBe(10050n);
    expect(parseAmountToMinor("29.99", "USD")).toBe(2999n);
    expect(parseAmountToMinor("0.50", "USD")).toBe(50n);
    expect(parseAmountToMinor("0", "USD")).toBe(0n);
  });

  it("handles a zero-decimal currency (JPY)", () => {
    expect(parseAmountToMinor("100", "JPY")).toBe(100n);
    expect(() => parseAmountToMinor("100.5", "JPY")).toThrow();
  });

  it("handles a three-decimal currency (BHD)", () => {
    expect(parseAmountToMinor("1.5", "BHD")).toBe(1500n);
    expect(parseAmountToMinor("1.234", "BHD")).toBe(1234n);
  });

  it("rejects over-precision — never rounds (money-rules §3)", () => {
    expect(() => parseAmountToMinor("29.999", "USD")).toThrow();
  });

  it("rejects non-numeric, signed, and grouped input", () => {
    expect(() => parseAmountToMinor("abc", "USD")).toThrow();
    expect(() => parseAmountToMinor("-5", "USD")).toThrow();
    expect(() => parseAmountToMinor("1,299.99", "USD")).toThrow();
  });
});

describe("formatMinorPlain / round-trip", () => {
  it("formats minor units to a plain major string", () => {
    expect(formatMinorPlain(2999n, "USD")).toBe("29.99");
    expect(formatMinorPlain(50n, "USD")).toBe("0.50");
    expect(formatMinorPlain(100n, "JPY")).toBe("100");
    expect(formatMinorPlain(1500n, "BHD")).toBe("1.500");
  });

  it("round-trips canonical strings losslessly", () => {
    for (const value of ["29.99", "0.50", "100.00", "1000.00"]) {
      expect(formatMinorPlain(parseAmountToMinor(value, "USD"), "USD")).toBe(value);
    }
  });
});

describe("formatMinorCurrency", () => {
  it("renders a localized currency string", () => {
    expect(formatMinorCurrency(2999n, "USD", "en-US")).toBe("$29.99");
    expect(formatMinorCurrency(100n, "JPY", "en-US")).toBe("¥100");
  });

  /**
   * Arabic presentation (Localization Authority · Deliverable 9): mark AFTER the amount with a
   * space, Latin digits, "," thousands separator, and whole amounts without decimals.
   */
  it("renders Arabic money with the mark after the amount and Latin digits", () => {
    expect(formatMinorCurrency(120000n, "EGP", "ar")).toBe("1,200 ج.م");
    expect(formatMinorCurrency(40000n, "EGP", "ar")).toBe("400 ج.م");
    expect(formatMinorCurrency(0n, "EGP", "ar")).toBe("0 ج.م");
  });

  it("keeps decimals for fractional Arabic amounts, drops them when whole", () => {
    expect(formatMinorCurrency(40050n, "EGP", "ar")).toBe("400.50 ج.م");
    expect(formatMinorCurrency(120000n, "SAR", "ar")).toBe("1,200 ر.س");
    expect(formatMinorCurrency(150000n, "KWD", "ar")).toBe("150 د.ك");
  });

  it("uses each currency's Authority mark", () => {
    expect(formatMinorCurrency(50000n, "AED", "ar")).toBe("500 د.إ");
    expect(formatMinorCurrency(50000n, "JOD", "ar")).toBe("50 د.أ");
  });
});

describe("currencySymbol", () => {
  it("returns the Authority currency mark under Arabic, the Intl symbol otherwise", () => {
    expect(currencySymbol("EGP", "ar")).toBe("ج.م");
    expect(currencySymbol("SAR", "ar")).toBe("ر.س");
    expect(currencySymbol("USD", "en-US")).toBe("$");
  });
});
