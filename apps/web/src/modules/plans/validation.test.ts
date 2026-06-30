import { describe, expect, it } from "vitest";
import { PlanListParamsSchema, PlanSchema } from "./validation";

/**
 * Unit tests (DB-free) for the Plan Management trust boundary. They prove the schema encodes
 * the domain rules it claims — name required, duration ≥ 1 whole period, valid unit, a
 * well-formed price string, optional description — without a database. Currency-specific
 * precision (rejecting over-precise prices) is proven in `lib/money.test.ts` + the
 * integration suite, since it depends on the gym's currency.
 */
describe("PlanSchema", () => {
  const valid = {
    name: "Monthly",
    description: "",
    durationValue: "1",
    durationUnit: "MONTH",
    price: "29.99",
  };

  it("accepts a well-formed plan", () => {
    const result = PlanSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.durationValue).toBe(1);
      expect(result.data.description).toBeNull(); // empty → null
      expect(result.data.price).toBe("29.99");
    }
  });

  it("rejects a missing name", () => {
    const result = PlanSchema.safeParse({ ...valid, name: " " });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.name).toBeTruthy();
  });

  it("rejects a non-positive or non-integer duration", () => {
    expect(PlanSchema.safeParse({ ...valid, durationValue: "0" }).success).toBe(false);
    expect(PlanSchema.safeParse({ ...valid, durationValue: "1.5" }).success).toBe(false);
  });

  it("rejects an unknown duration unit", () => {
    expect(PlanSchema.safeParse({ ...valid, durationUnit: "YEAR" }).success).toBe(false);
  });

  it("rejects a malformed price string (sign, letters, grouping)", () => {
    for (const price of ["-5", "abc", "1,299.99", ""]) {
      expect(PlanSchema.safeParse({ ...valid, price }).success).toBe(false);
    }
  });
});

describe("PlanListParamsSchema", () => {
  it("defaults to the active list, page 1", () => {
    expect(PlanListParamsSchema.parse({})).toMatchObject({ status: "ACTIVE", page: 1 });
  });

  it("falls back to safe defaults for bad values", () => {
    const result = PlanListParamsSchema.parse({ status: "BOGUS", page: "-2" });
    expect(result.status).toBe("ACTIVE");
    expect(result.page).toBe(1);
  });
});
