import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@pulse/db";
import { ALL_PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import {
  completeOnboarding,
  getGymSettings,
  updateDefaultBranch,
  updateGymSettings,
  updateMyProfile,
} from "@/modules/gym/service";

/**
 * Integration P0 tests for Gym Initialization (Sprint-1 Epic-1) against the isolated test
 * DB. The service core takes an explicit `principal`, so authorization is proven **by
 * permission** (allow AND deny) without needing multiple seeded users — and tenancy is
 * exercised with a real second gym. Covers: permission gating, cross-tenant → 404,
 * self-ownership scoping, validation, and onboarding completion via an injected clock.
 */
let owner: AuthenticatedPrincipal;
let noPerms: AuthenticatedPrincipal;
let gymId: string;
let branchId: string;

const validGym = {
  name: "Iron Works Gym",
  contactEmail: "",
  contactPhone: "",
  defaultCurrency: "EUR",
  timeZone: "Europe/Berlin",
  expiringSoonWindowDays: "10",
  gracePeriodDays: "3",
};

beforeAll(async () => {
  const ownerUser = await prisma.user.findUniqueOrThrow({ where: { email: "owner@pulse.local" } });
  const gymUser = await prisma.gymUser.findFirstOrThrow({ where: { userId: ownerUser.id } });
  const branch = await prisma.branch.findFirstOrThrow({ where: { gymId: gymUser.gymId } });
  gymId = gymUser.gymId;
  branchId = branch.id;
  owner = {
    userId: ownerUser.id,
    email: ownerUser.email,
    displayName: ownerUser.displayName,
    gymId,
    branchId,
    gymUserId: gymUser.id,
    permissions: [...ALL_PERMISSION_KEYS],
  };
  noPerms = { ...owner, permissions: [] };
});

describe("gym settings — authorization by permission", () => {
  it("allows an actor with gym.view to read", async () => {
    const view = await getGymSettings(owner);
    expect(view.defaultCurrency).toBeDefined();
  });

  it("denies reading without gym.view (by permission, not role)", async () => {
    await expect(getGymSettings(noPerms)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("updates with gym.manage and persists", async () => {
    const result = await updateGymSettings(owner, validGym);
    expect(result.status).toBe("success");
    const gym = await prisma.gym.findUniqueOrThrow({ where: { id: gymId } });
    expect(gym.name).toBe("Iron Works Gym");
    expect(gym.defaultCurrency).toBe("EUR");
    expect(gym.expiringSoonWindowDays).toBe(10);
  });

  it("denies updating without gym.manage", async () => {
    await expect(updateGymSettings(noPerms, validGym)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("returns field errors for an invalid currency (no persistence)", async () => {
    const result = await updateGymSettings(owner, { ...validGym, defaultCurrency: "ZZZ" });
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.defaultCurrency).toBeTruthy();
  });
});

describe("branch — tenancy isolation", () => {
  it("updates the gym's own branch", async () => {
    const result = await updateDefaultBranch(owner, branchId, {
      name: "Downtown",
      contactPhone: "",
      isActive: "on",
      address: { city: "Berlin" },
    });
    expect(result.status).toBe("success");
    const branch = await prisma.branch.findUniqueOrThrow({ where: { id: branchId } });
    expect(branch.name).toBe("Downtown");
  });

  it("surfaces a cross-gym branch as 404 (never 403)", async () => {
    const otherGym = await prisma.gym.create({
      data: { name: "Other Gym", defaultCurrency: "USD", timeZone: "UTC" },
    });
    const otherBranch = await prisma.branch.create({
      data: { gymId: otherGym.id, name: "Other Branch" },
    });
    await expect(
      updateDefaultBranch(owner, otherBranch.id, {
        name: "Hijacked",
        isActive: "on",
        address: {},
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("denies branch update without branches.manage", async () => {
    await expect(
      updateDefaultBranch(noPerms, branchId, { name: "x", isActive: "on", address: {} }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("owner profile — self ownership", () => {
  it("updates only the principal's own user (scoped by userId, not gymId)", async () => {
    const other = await prisma.user.create({
      data: { email: `other-${Date.now()}@pulse.test`, displayName: "Before", passwordHash: "!x" },
    });
    const otherPrincipal: AuthenticatedPrincipal = { ...owner, userId: other.id };

    const result = await updateMyProfile(otherPrincipal, { displayName: "After" });
    expect(result.status).toBe("success");

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: other.id } });
    expect(updated.displayName).toBe("After");
    // The owner (a different user) was untouched — the action targets principal.userId only.
    const stillOwner = await prisma.user.findUniqueOrThrow({ where: { id: owner.userId } });
    expect(stillOwner.displayName).not.toBe("After");
  });
});

describe("onboarding completion", () => {
  it("marks setup complete using the injected clock", async () => {
    const when = new Date("2026-02-01T12:00:00.000Z");
    const fixedClock: IClock = { now: () => when, today: () => "2026-02-01" };
    const result = await completeOnboarding(owner, fixedClock);
    expect(result.status).toBe("success");
    const gym = await prisma.gym.findUniqueOrThrow({ where: { id: gymId } });
    expect(gym.setupCompletedAt?.toISOString()).toBe(when.toISOString());
  });

  it("requires gym.manage to complete onboarding", async () => {
    await expect(completeOnboarding(noPerms)).rejects.toBeInstanceOf(AuthorizationError);
  });
});
