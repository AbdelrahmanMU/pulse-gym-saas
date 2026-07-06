import { describe, expect, it } from "vitest";
import { isEmailIdentifier, normalizePhone } from "@pulse/auth";

/**
 * Sign-in identifier helpers (Pilot Readiness) — the single-field phone-OR-email
 * resolution. The security-relevant properties: email detection is the one `@`
 * character (never a format guess), and phone normalization is **canonical and
 * shared** between the staff write boundary and the login lookup, including the
 * Arabic-keyboard reality (Arabic-Indic digits) — so what a receptionist types
 * always matches what was stored.
 */
describe("isEmailIdentifier", () => {
  it("treats anything containing @ as an email", () => {
    expect(isEmailIdentifier("owner@pulse.local")).toBe(true);
    expect(isEmailIdentifier("not-quite@")).toBe(true);
  });

  it("treats @-free input as a phone candidate", () => {
    expect(isEmailIdentifier("01001234567")).toBe(false);
    expect(isEmailIdentifier("+20 100 123 4567")).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("keeps a canonical local phone as-is", () => {
    expect(normalizePhone("01001234567")).toBe("01001234567");
  });

  it("preserves a single leading + (international form)", () => {
    expect(normalizePhone("+201001234567")).toBe("+201001234567");
  });

  it("strips the separators people actually type (spaces, dashes, dots, parens)", () => {
    expect(normalizePhone("0100 123-4567")).toBe("01001234567");
    expect(normalizePhone("+20 (100) 123.4567")).toBe("+201001234567");
  });

  it("converts Arabic-Indic and Extended Arabic-Indic digits to ASCII", () => {
    expect(normalizePhone("٠١٠٠١٢٣٤٥٦٧")).toBe("01001234567");
    expect(normalizePhone("۰۱۰۰۱۲۳۴۵۶۷")).toBe("01001234567");
    expect(normalizePhone("٠١٠٠ ١٢٣ ٤٥٦٧")).toBe("01001234567");
  });

  it("rejects non-phone input (letters, misplaced +, empty)", () => {
    expect(normalizePhone("not a phone")).toBeNull();
    expect(normalizePhone("0100x123")).toBeNull();
    expect(normalizePhone("01+001234567")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("rejects implausible lengths (under 6 or over 20 digits)", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("123456")).toBe("123456");
    expect(normalizePhone("123456789012345678901")).toBeNull();
  });
});
