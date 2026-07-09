import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@pulse/db";
import { ALL_PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal } from "@pulse/types";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import {
  archivePlan,
  createPlan,
  listPlans,
  restorePlan,
  updatePlan,
} from "@/modules/plans/service";

/**
 * Integration P0 tests for Plan Management (Sprint-1 Epic-3) against the isolated test DB.
 * Covers the mandatory gates: tenant isolation (INV-1/2 → cross-gym 404), permission gating
 * (INV-5, allow AND deny), the duration/price contract, status (isActive) lifecycle, filters
 * — and the money proof: a plan created from "29.99" is stored as exactly 2999 minor units
 * (money-rules M-1; the seed gym's currency is USD).
 */
let owner: AuthenticatedPrincipal;
let noPerms: AuthenticatedPrincipal;
let ownerGymId: string;
let ownerCurrency: string; // the seed gym's default currency (2-decimal: USD/EUR across tests)
let otherGymId: string;

let seq = 0;
const mk = (over: Record<string, unknown> = {}) => ({
  name: `Plan ${Date.now()}-${seq++}`,
  description: "",
  durationValue: "1",
  durationUnit: "MONTH",
  price: "29.99",
  ...over,
});

beforeAll(async () => {
  const ownerUser = await prisma.user.findUniqueOrThrow({ where: { email: "owner@pulse.local" } });
  const gymUser = await prisma.gymUser.findFirstOrThrow({ where: { userId: ownerUser.id } });
  const branch = await prisma.branch.findFirstOrThrow({ where: { gymId: gymUser.gymId } });
  ownerGymId = gymUser.gymId;
  ownerCurrency = (
    await prisma.gym.findUniqueOrThrow({
      where: { id: ownerGymId },
      select: { defaultCurrency: true },
    })
  ).defaultCurrency;
  owner = {
    userId: ownerUser.id,
    email: ownerUser.email,
    displayName: ownerUser.displayName,
    gymId: ownerGymId,
    branchId: branch.id,
    gymUserId: gymUser.id,
    permissions: [...ALL_PERMISSION_KEYS],
  };
  noPerms = { ...owner, permissions: [] };

  const otherGym = await prisma.gym.create({
    data: { name: "Rival Gym", defaultCurrency: "USD", timeZone: "UTC" },
  });
  otherGymId = otherGym.id;
});

describe("create — pipeline, permission, money correctness", () => {
  it("stores the price as exact minor units in the gym currency (money proof)", async () => {
    const result = await createPlan(owner, mk({ name: "Money Proof", price: "29.99" }));
    expect(result.status).toBe("success");
    const plan = await prisma.plan.findUniqueOrThrow({ where: { id: result.planId } });
    expect(plan.price).toBe(2999n); // exact minor units, never a float (2-decimal currency)
    expect(plan.currency).toBe(ownerCurrency); // snapshotted from the gym's default currency
    expect(plan.isActive).toBe(true);
    expect(plan.gymId).toBe(ownerGymId);
    expect(plan.createdById).toBe(owner.userId);
  });

  it("denies create without plans.create (by permission, not role)", async () => {
    await expect(createPlan(noPerms, mk())).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("rejects an over-precise price for the currency as a field error (never rounds)", async () => {
    const result = await createPlan(owner, mk({ price: "29.999" }));
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.price).toBeTruthy();
  });

  it("rejects a non-positive duration (validation)", async () => {
    const result = await createPlan(owner, mk({ durationValue: "0" }));
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.durationValue).toBeTruthy();
  });
});

describe("list & search — tenant isolation and filters", () => {
  it("returns only the actor's gym, never another gym's plans (INV-2)", async () => {
    const tag = `Iso-${Date.now()}`;
    await createPlan(owner, mk({ name: `${tag} Mine` }));
    await prisma.plan.create({
      data: {
        gymId: otherGymId,
        name: `${tag} Theirs`,
        price: 1000n,
        currency: "USD",
        durationValue: 1,
        durationUnit: "MONTH",
      },
    });
    const result = await listPlans(owner, { status: "ALL", page: 1, q: tag });
    expect(result.rows.map((r) => r.name)).toEqual([`${tag} Mine`]);
  });

  it("partitions by status (ACTIVE hides archived; ARCHIVED hides active)", async () => {
    const tag = `Status-${Date.now()}`;
    const active = await createPlan(owner, mk({ name: `${tag} Active` }));
    const archived = await createPlan(owner, mk({ name: `${tag} Archived` }));
    await archivePlan(owner, archived.planId ?? "");

    const activeOnly = await listPlans(owner, { status: "ACTIVE", page: 1, q: tag });
    expect(activeOnly.rows.map((r) => r.id)).toEqual([active.planId]);
    const archivedOnly = await listPlans(owner, { status: "ARCHIVED", page: 1, q: tag });
    expect(archivedOnly.rows.map((r) => r.id)).toEqual([archived.planId]);
  });

  it("denies listing without plans.read", async () => {
    await expect(
      listPlans(noPerms, { status: "ACTIVE", page: 1, q: undefined }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("update — money, tenancy, permission", () => {
  it("updates name and price to exact new minor units", async () => {
    const created = await createPlan(owner, mk({ name: "Before", price: "29.99" }));
    const result = await updatePlan(
      owner,
      created.planId ?? "",
      mk({ name: "After", price: "49.50" }),
    );
    expect(result.status).toBe("success");
    const plan = await prisma.plan.findUniqueOrThrow({ where: { id: created.planId } });
    expect(plan.name).toBe("After");
    expect(plan.price).toBe(4950n);
  });

  it("surfaces a cross-gym plan as 404 (never 403)", async () => {
    const foreign = await prisma.plan.create({
      data: {
        gymId: otherGymId,
        name: "Foreign",
        price: 1000n,
        currency: "USD",
        durationValue: 1,
        durationUnit: "MONTH",
      },
    });
    await expect(updatePlan(owner, foreign.id, mk())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("denies update without plans.update", async () => {
    const created = await createPlan(owner, mk());
    await expect(updatePlan(noPerms, created.planId ?? "", mk())).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
});

describe("archive & restore (PLN-2, plans.deactivate)", () => {
  it("archives and restores a plan (isActive toggles)", async () => {
    const created = await createPlan(owner, mk());
    expect((await archivePlan(owner, created.planId ?? "")).status).toBe("success");
    let plan = await prisma.plan.findUniqueOrThrow({ where: { id: created.planId } });
    expect(plan.isActive).toBe(false);

    expect((await restorePlan(owner, created.planId ?? "")).status).toBe("success");
    plan = await prisma.plan.findUniqueOrThrow({ where: { id: created.planId } });
    expect(plan.isActive).toBe(true);
  });

  it("denies archive without plans.deactivate", async () => {
    const created = await createPlan(owner, mk());
    await expect(archivePlan(noPerms, created.planId ?? "")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
});
