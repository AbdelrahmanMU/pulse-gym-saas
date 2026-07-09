import { describe, expect, it } from "vitest";
import { uuidv7 } from "./id-generator";

/**
 * UUID v7 bit-layout test (T-26). The generator is hand-rolled, so the version nibble
 * (`7`) and variant bits (`10xx`) are explicitly asserted — a subtle layout bug would
 * otherwise be invisible. Also checks format and uniqueness, and that ids are
 * roughly time-ordered (the v7 property the DB relies on for index locality).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("uuidv7", () => {
  it("produces a canonical UUID string", () => {
    expect(uuidv7()).toMatch(UUID_RE);
  });

  it("sets the version nibble to 7", () => {
    // Char 14 (0-indexed) is the first nibble of the 3rd group → the version.
    expect(uuidv7()[14]).toBe("7");
  });

  it("sets the variant bits to 0b10 (8/9/a/b)", () => {
    // Char 19 is the first nibble of the 4th group → the variant.
    expect(["8", "9", "a", "b"]).toContain(uuidv7()[19]);
  });

  it("is unique across many draws", () => {
    const ids = new Set(Array.from({ length: 5000 }, () => uuidv7()));
    expect(ids.size).toBe(5000);
  });

  it("is monotonic across the millisecond timestamp prefix", async () => {
    const first = uuidv7();
    await new Promise((r) => setTimeout(r, 2));
    const second = uuidv7();
    // The 48-bit ms timestamp occupies the leading 12 hex chars (minus dash).
    const prefix = (id: string): string => id.replace(/-/g, "").slice(0, 12);
    expect(prefix(second) >= prefix(first)).toBe(true);
  });
});
