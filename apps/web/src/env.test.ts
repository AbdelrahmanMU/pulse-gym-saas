import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

// Smoke unit test for the fail-fast env module (T-15). `parseEnv` is pure, so we
// test it directly without mutating the real process environment.
const validEnv = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db?schema=public",
  AUTH_SECRET: "a-sufficiently-long-dev-secret",
};

describe("env validation", () => {
  it("parses a valid environment and freezes it", () => {
    const env = parseEnv({ ...validEnv });
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(env.NODE_ENV).toBe("development"); // default applied
    expect(Object.isFrozen(env)).toBe(true);
  });

  it("refuses to boot when DATABASE_URL is missing", () => {
    const { DATABASE_URL: _omitted, ...rest } = validEnv;
    expect(() => parseEnv(rest)).toThrowError(/DATABASE_URL/);
  });

  it("refuses to boot when AUTH_SECRET is missing", () => {
    const { AUTH_SECRET: _omitted, ...rest } = validEnv;
    expect(() => parseEnv(rest)).toThrowError(/AUTH_SECRET/);
  });

  it("reports every missing required variable at once", () => {
    try {
      parseEnv({});
      expect.unreachable("should have thrown");
    } catch (error) {
      const message = String(error);
      expect(message).toContain("DATABASE_URL");
      expect(message).toContain("AUTH_SECRET");
    }
  });
});
