import { describe, expect, it } from "vitest";
import { PaymentMethod } from "@pulse/db";
import { RecordPaymentSchema, VoidPaymentSchema } from "./validation";

/**
 * Payments input-boundary validation (Epic-5). The amount is a string here (parsed to minor units
 * + range-checked `> 0` in the service against the membership currency — not the schema's job); the
 * schema guards method/date/note shape. Optional text normalizes empty → null.
 */
describe("RecordPaymentSchema", () => {
  const base = { amount: "50.00", method: PaymentMethod.CASH };

  it("accepts a well-formed payment", () => {
    const r = RecordPaymentSchema.safeParse({
      ...base,
      receivedOn: "2026-07-01",
      note: "Cash at desk",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.method).toBe(PaymentMethod.CASH);
      expect(r.data.receivedOn).toBe("2026-07-01");
      expect(r.data.note).toBe("Cash at desk");
    }
  });

  it("defaults an empty date and note to null", () => {
    const r = RecordPaymentSchema.safeParse({ ...base, receivedOn: "", note: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.receivedOn).toBeNull();
      expect(r.data.note).toBeNull();
    }
  });

  it("rejects a missing amount", () => {
    expect(RecordPaymentSchema.safeParse({ amount: "", method: PaymentMethod.CASH }).success).toBe(
      false,
    );
  });

  it("rejects an unknown method", () => {
    expect(RecordPaymentSchema.safeParse({ amount: "10", method: "BITCOIN" }).success).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(RecordPaymentSchema.safeParse({ ...base, receivedOn: "01/07/2026" }).success).toBe(
      false,
    );
  });
});

describe("VoidPaymentSchema", () => {
  it("accepts an empty reason as null", () => {
    const r = VoidPaymentSchema.safeParse({ voidReason: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.voidReason).toBeNull();
  });

  it("accepts a reason", () => {
    const r = VoidPaymentSchema.safeParse({ voidReason: "Entered twice" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.voidReason).toBe("Entered twice");
  });
});
