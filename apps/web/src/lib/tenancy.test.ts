import { describe, expect, it } from "vitest";
import { assertSameGym } from "./tenancy";
import { NotFoundError } from "./errors";

/**
 * Tenant-isolation guard (INV-2). Session 3 has no business resource to isolate yet,
 * so this exercises the **mechanism** every feature query will use: a gym mismatch
 * surfaces as **404, never 403** (no existence disclosure). Resource-level
 * cross-tenant isolation is exercised when the first feature lands.
 */
describe("assertSameGym", () => {
  it("passes when the resource belongs to the session's gym", () => {
    expect(() => assertSameGym("gym-A", "gym-A")).not.toThrow();
  });

  it("throws NotFoundError (404, never 403) on a cross-tenant mismatch", () => {
    try {
      assertSameGym("gym-A", "gym-B");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundError);
      expect((error as NotFoundError).status).toBe(404);
    }
  });
});
