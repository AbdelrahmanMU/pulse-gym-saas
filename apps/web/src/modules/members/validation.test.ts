import { describe, expect, it } from "vitest";
import { AssignTrainerSchema, MemberListParamsSchema, MemberSchema } from "./validation";

/**
 * Unit tests (DB-free) for the Member Management trust boundary. They prove the schema
 * encodes the domain rules it claims — name required + at-least-one-contact (MBR-2/INV-9),
 * email/date parsing, empty→null normalization, and the list-param fallbacks — without a
 * database. DB-enforced rules (INV-3 uniqueness, the contact CHECK) are proven in the
 * integration suite.
 */
describe("MemberSchema", () => {
  const valid = {
    fullName: "Dana Ito",
    phone: "0100",
    email: "",
    dateOfBirth: "",
    gender: "",
    joinedOn: "",
    notesSummary: "",
  };

  it("accepts a member with a name and a phone", () => {
    const result = MemberSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("0100");
      expect(result.data.email).toBeNull(); // empty → null, never ""
    }
  });

  it("accepts a member with a name and only an email", () => {
    const result = MemberSchema.safeParse({ ...valid, phone: "", email: "dana@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing name (MBR-2)", () => {
    const result = MemberSchema.safeParse({ ...valid, fullName: "  " });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.fullName).toBeTruthy();
  });

  it("rejects no contact method — phone OR email required (MBR-2/INV-9)", () => {
    const result = MemberSchema.safeParse({ ...valid, phone: "", email: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.phone).toBeTruthy();
  });

  it("rejects an invalid email", () => {
    const result = MemberSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.email).toBeTruthy();
  });

  it("parses a date-of-birth string into a Date", () => {
    const result = MemberSchema.safeParse({ ...valid, dateOfBirth: "1990-05-20" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeInstanceOf(Date);
      expect(result.data.dateOfBirth?.toISOString().slice(0, 10)).toBe("1990-05-20");
    }
  });

  it("rejects an unparseable date", () => {
    const result = MemberSchema.safeParse({ ...valid, joinedOn: "not-a-date" });
    expect(result.success).toBe(false);
  });
});

describe("MemberListParamsSchema", () => {
  it("defaults to the active list, page 1, any trainer", () => {
    const result = MemberListParamsSchema.parse({});
    expect(result).toMatchObject({ status: "ACTIVE", page: 1, trainer: "ALL" });
    expect(result.q).toBeUndefined();
  });

  it("falls back to safe defaults for bad values (never throws)", () => {
    const result = MemberListParamsSchema.parse({ status: "BOGUS", page: "-3" });
    expect(result.status).toBe("ACTIVE");
    expect(result.page).toBe(1);
  });

  it("keeps a trimmed search term and an explicit status", () => {
    const result = MemberListParamsSchema.parse({ q: "  ana ", status: "ARCHIVED", page: "2" });
    expect(result).toMatchObject({ q: "ana", status: "ARCHIVED", page: 2 });
  });
});

describe("AssignTrainerSchema", () => {
  it("requires a uuid trainer id", () => {
    expect(AssignTrainerSchema.safeParse({ trainerGymUserId: "x" }).success).toBe(false);
    expect(
      AssignTrainerSchema.safeParse({ trainerGymUserId: "01920000-0000-7000-8000-000000000099" })
        .success,
    ).toBe(true);
  });
});
