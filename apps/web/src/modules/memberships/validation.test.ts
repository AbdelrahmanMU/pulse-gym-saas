import { describe, expect, it } from "vitest";
import {
  CreateMembershipSchema,
  FreezeMembershipSchema,
  MembershipListParamsSchema,
  UpgradeMembershipSchema,
} from "./validation";

/**
 * Membership Lifecycle validation (api-standards trust boundary). Covers the boundaries that
 * matter: required ids, optional-start parsing, the freeze-days integer rule, and the
 * list-params catch defaults (a bad status/page never throws — it falls back).
 */
const UUID = "01920000-0000-7000-8000-000000000001";

describe("CreateMembershipSchema", () => {
  it("requires a member and a plan, and accepts an optional start date", () => {
    const ok = CreateMembershipSchema.safeParse({
      memberId: UUID,
      planId: UUID,
      startDate: "2026-06-30",
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.startDate).toBe("2026-06-30");
  });

  it("treats a blank start date as null (defaults to today in the service)", () => {
    const ok = CreateMembershipSchema.safeParse({ memberId: UUID, planId: UUID, startDate: "" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.startDate).toBeNull();
  });

  it("rejects a non-uuid member/plan and a malformed date", () => {
    expect(CreateMembershipSchema.safeParse({ memberId: "nope", planId: UUID }).success).toBe(
      false,
    );
    expect(
      CreateMembershipSchema.safeParse({ memberId: UUID, planId: UUID, startDate: "30-06-2026" })
        .success,
    ).toBe(false);
  });
});

describe("UpgradeMembershipSchema", () => {
  it("requires a target plan", () => {
    expect(UpgradeMembershipSchema.safeParse({ planId: UUID }).success).toBe(true);
    expect(UpgradeMembershipSchema.safeParse({}).success).toBe(false);
  });
});

describe("FreezeMembershipSchema", () => {
  it("requires a whole number of days ≥ 1", () => {
    expect(FreezeMembershipSchema.safeParse({ frozenDays: "30" }).success).toBe(true);
    expect(FreezeMembershipSchema.safeParse({ frozenDays: "0" }).success).toBe(false);
    expect(FreezeMembershipSchema.safeParse({ frozenDays: "1.5" }).success).toBe(false);
  });
});

describe("MembershipListParamsSchema", () => {
  it("falls back to safe defaults for bad status/page (never throws)", () => {
    const parsed = MembershipListParamsSchema.parse({ status: "bogus", page: "-3" });
    // LIVE (current-periods projection) is the default operational view; ALL reveals history.
    expect(parsed.status).toBe("LIVE");
    expect(parsed.page).toBe(1);
  });
});
