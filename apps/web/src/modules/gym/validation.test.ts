import { describe, expect, it } from "vitest";
import { BranchSchema, GymSettingsSchema, OwnProfileSchema } from "./validation";

/**
 * Unit tests for the Gym Initialization Zod schemas (Sprint-1 Epic-1) — the trust
 * boundary. Grounded in the domain rules: ISO-4217 currency (money-rules §1), IANA tz
 * (time-rules §1), window/grace ≥ 0 (mirrors the DB CHECK). DB-free.
 */

const validGym = {
  name: "Iron Works Gym",
  contactEmail: "owner@ironworks.test",
  contactPhone: "+1 555 0100",
  defaultCurrency: "usd", // lower-case accepted → normalized to USD
  timeZone: "America/New_York",
  expiringSoonWindowDays: "7",
  gracePeriodDays: "0",
};

describe("GymSettingsSchema", () => {
  it("accepts a valid gym and upper-cases the currency", () => {
    const result = GymSettingsSchema.safeParse(validGym);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.defaultCurrency).toBe("USD");
  });

  it("rejects an empty name", () => {
    const r = GymSettingsSchema.safeParse({ ...validGym, name: "  " });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown currency code (ISO-4217)", () => {
    const r = GymSettingsSchema.safeParse({ ...validGym, defaultCurrency: "ZZZ" });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid IANA time zone", () => {
    const r = GymSettingsSchema.safeParse({ ...validGym, timeZone: "Mars/Olympus" });
    expect(r.success).toBe(false);
  });

  it("rejects a negative expiring-soon window (DB CHECK ≥ 0)", () => {
    const r = GymSettingsSchema.safeParse({ ...validGym, expiringSoonWindowDays: "-1" });
    expect(r.success).toBe(false);
  });

  it("normalizes an empty optional contact to null", () => {
    const r = GymSettingsSchema.safeParse({ ...validGym, contactEmail: "", contactPhone: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.contactEmail).toBeNull();
      expect(r.data.contactPhone).toBeNull();
    }
  });
});

describe("BranchSchema", () => {
  it("accepts a valid branch and coerces the active checkbox", () => {
    const r = BranchSchema.safeParse({
      name: "Main",
      contactPhone: "",
      isActive: "on",
      address: { city: "Boston" },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.isActive).toBe(true);
      expect(r.data.address.city).toBe("Boston");
    }
  });

  it("treats a missing checkbox as inactive", () => {
    const r = BranchSchema.safeParse({ name: "Main", isActive: undefined, address: {} });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isActive).toBe(false);
  });

  it("rejects an empty branch name", () => {
    const r = BranchSchema.safeParse({ name: "", isActive: "on", address: {} });
    expect(r.success).toBe(false);
  });
});

describe("OwnProfileSchema", () => {
  it("accepts a valid profile", () => {
    const r = OwnProfileSchema.safeParse({
      displayName: "Dana Owner",
      phone: "",
      avatarUrl: "https://cdn.test/a.png",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBeNull();
  });

  it("rejects an empty display name", () => {
    expect(OwnProfileSchema.safeParse({ displayName: "" }).success).toBe(false);
  });

  it("rejects a malformed avatar URL", () => {
    const r = OwnProfileSchema.safeParse({ displayName: "Dana", avatarUrl: "not-a-url" });
    expect(r.success).toBe(false);
  });
});
