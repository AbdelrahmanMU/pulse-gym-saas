import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@pulse/db";
import { ALL_PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal } from "@pulse/types";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import {
  archiveMember,
  assignTrainer,
  createMember,
  getMember,
  listAssignableTrainers,
  listMembers,
  reactivateMember,
  unassignTrainer,
  updateMember,
} from "@/modules/members/service";

/**
 * Integration P0 tests for Member Management (Sprint-1 Epic-2) against the isolated test DB.
 * The service core takes an explicit `principal`, so authorization is proven **by
 * permission** (allow AND deny) and tenancy with a real second gym. Covers the mandatory
 * gates: tenant isolation (INV-1/2 → cross-gym 404), permission gating (INV-5), the
 * member contract (INV-9 contact-present, INV-3 contact-unique-per-gym), archive/reactivate
 * (ARC-1/2 + the partial-unique contact recycle), and trainer assignment (INV-35 one open
 * assignment, INV-36 same-gym active target). ARC-3's membership/balance preconditions are
 * `it.todo` — deferred to Epic D (see service `assertArchivable`).
 */
let owner: AuthenticatedPrincipal;
let noPerms: AuthenticatedPrincipal;
let ownerGymId: string;
let trainerA: string; // GymUser ids in the owner's gym
let trainerB: string;
let otherGymId: string;
let otherBranchId: string;
let crossGymTrainer: string; // a GymUser in another gym

let seq = 0;
const uniquePhone = (): string => `+1555${Date.now()}${seq++}`;
const mk = (over: Record<string, unknown> = {}) => ({
  fullName: "Test Member",
  phone: uniquePhone(),
  email: "",
  dateOfBirth: "",
  gender: "",
  joinedOn: "",
  notesSummary: "",
  ...over,
});

async function makeStaff(gymId: string, name: string): Promise<string> {
  const role = await prisma.role.findFirstOrThrow({ where: { gymId: null, isAssignable: true } });
  const user = await prisma.user.create({
    data: {
      email: `${name}-${Date.now()}-${seq++}@pulse.test`,
      displayName: name,
      passwordHash: "!x",
    },
  });
  const gymUser = await prisma.gymUser.create({
    data: { gymId, userId: user.id, roleId: role.id, status: "ACTIVE" },
  });
  return gymUser.id;
}

beforeAll(async () => {
  const ownerUser = await prisma.user.findUniqueOrThrow({ where: { email: "owner@pulse.local" } });
  const gymUser = await prisma.gymUser.findFirstOrThrow({ where: { userId: ownerUser.id } });
  const branch = await prisma.branch.findFirstOrThrow({ where: { gymId: gymUser.gymId } });
  ownerGymId = gymUser.gymId;
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
  otherBranchId = (
    await prisma.branch.create({ data: { gymId: otherGym.id, name: "Rival Branch" } })
  ).id;

  trainerA = await makeStaff(ownerGymId, "Trainer A");
  trainerB = await makeStaff(ownerGymId, "Trainer B");
  crossGymTrainer = await makeStaff(otherGymId, "Rival Trainer");
});

describe("create — pipeline, permission, and the member contract", () => {
  it("creates a member scoped to the actor's gym and branch", async () => {
    const result = await createMember(owner, mk({ fullName: "Ada Lovelace" }));
    expect(result.status).toBe("success");
    const member = await prisma.member.findUniqueOrThrow({ where: { id: result.memberId } });
    expect(member.gymId).toBe(ownerGymId);
    expect(member.branchId).toBe(owner.branchId);
    expect(member.createdById).toBe(owner.userId);
    expect(member.status).toBe("ACTIVE");
  });

  it("denies create without members.create (by permission, not role)", async () => {
    await expect(createMember(noPerms, mk())).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("rejects a member with no contact method (MBR-2/INV-9)", async () => {
    const result = await createMember(owner, mk({ phone: "", email: "" }));
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.fieldErrors?.phone).toBeTruthy();
  });

  it("enforces contact uniqueness within the gym (INV-3) as a field error", async () => {
    const phone = uniquePhone();
    expect((await createMember(owner, mk({ phone }))).status).toBe("success");
    const dup = await createMember(owner, mk({ phone }));
    expect(dup.status).toBe("error");
    if (dup.status === "error") expect(dup.fieldErrors?.phone).toBeTruthy();
  });

  it("allows the same contact in a different gym (uniqueness is per-tenant, MBR-3)", async () => {
    const phone = uniquePhone();
    expect((await createMember(owner, mk({ phone }))).status).toBe("success");
    // Same phone, other gym, written directly → the partial-unique is per gym, so this is allowed.
    await expect(
      prisma.member.create({
        data: { gymId: otherGymId, branchId: otherBranchId, fullName: "Twin", phone },
      }),
    ).resolves.toBeDefined();
  });
});

describe("list & search — tenant isolation", () => {
  it("returns only the actor's gym, never another gym's members (INV-2)", async () => {
    const tag = `Iso-${Date.now()}`;
    await createMember(owner, mk({ fullName: `${tag} Mine` }));
    await prisma.member.create({
      data: {
        gymId: otherGymId,
        branchId: otherBranchId,
        fullName: `${tag} Theirs`,
        phone: uniquePhone(),
      },
    });
    const result = await listMembers(owner, { status: "ALL", trainer: "ALL", page: 1, q: tag });
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.fullName).toBe(`${tag} Mine`);
  });

  it("denies listing without members.read", async () => {
    await expect(
      listMembers(noPerms, { status: "ACTIVE", trainer: "ALL", page: 1, q: undefined }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("filters — status and responsible trainer", () => {
  it("partitions by status (ACTIVE hides archived; ARCHIVED hides active)", async () => {
    const tag = `Status-${Date.now()}`;
    const active = await createMember(owner, mk({ fullName: `${tag} Active` }));
    const archived = await createMember(owner, mk({ fullName: `${tag} Archived` }));
    await archiveMember(owner, archived.memberId ?? "");

    const activeOnly = await listMembers(owner, {
      status: "ACTIVE",
      trainer: "ALL",
      page: 1,
      q: tag,
    });
    expect(activeOnly.rows.map((r) => r.id)).toEqual([active.memberId]);

    const archivedOnly = await listMembers(owner, {
      status: "ARCHIVED",
      trainer: "ALL",
      page: 1,
      q: tag,
    });
    expect(archivedOnly.rows.map((r) => r.id)).toEqual([archived.memberId]);

    const all = await listMembers(owner, { status: "ALL", trainer: "ALL", page: 1, q: tag });
    expect(all.total).toBe(2);
  });

  it("partitions by trainer (assigned id vs UNASSIGNED)", async () => {
    const tag = `Trainer-${Date.now()}`;
    const assigned = await createMember(owner, mk({ fullName: `${tag} Coached` }));
    const unassigned = await createMember(owner, mk({ fullName: `${tag} Solo` }));
    await assignTrainer(owner, assigned.memberId ?? "", { trainerGymUserId: trainerA });

    const byTrainer = await listMembers(owner, {
      status: "ALL",
      trainer: trainerA,
      page: 1,
      q: tag,
    });
    expect(byTrainer.rows.map((r) => r.id)).toEqual([assigned.memberId]);
    expect(byTrainer.rows[0]?.trainerName).toBe("Trainer A");

    const none = await listMembers(owner, {
      status: "ALL",
      trainer: "UNASSIGNED",
      page: 1,
      q: tag,
    });
    expect(none.rows.map((r) => r.id)).toEqual([unassigned.memberId]);
  });
});

describe("update — tenancy and permission", () => {
  it("updates a member's details", async () => {
    const created = await createMember(owner, mk({ fullName: "Before" }));
    const result = await updateMember(owner, created.memberId ?? "", mk({ fullName: "After" }));
    expect(result.status).toBe("success");
    const member = await prisma.member.findUniqueOrThrow({ where: { id: created.memberId } });
    expect(member.fullName).toBe("After");
  });

  it("surfaces a cross-gym member as 404 (never 403)", async () => {
    const foreign = await prisma.member.create({
      data: {
        gymId: otherGymId,
        branchId: otherBranchId,
        fullName: "Foreign",
        phone: uniquePhone(),
      },
    });
    await expect(updateMember(owner, foreign.id, mk())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("denies update without members.update", async () => {
    const created = await createMember(owner, mk());
    await expect(updateMember(noPerms, created.memberId ?? "", mk())).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
});

describe("archive & reactivate (ARC-1/2)", () => {
  it("archives a member (status + archivedAt) and reactivates them", async () => {
    const created = await createMember(owner, mk());
    expect((await archiveMember(owner, created.memberId ?? "")).status).toBe("success");
    let member = await prisma.member.findUniqueOrThrow({ where: { id: created.memberId } });
    expect(member.status).toBe("ARCHIVED");
    expect(member.archivedAt).not.toBeNull();

    expect((await reactivateMember(owner, created.memberId ?? "")).status).toBe("success");
    member = await prisma.member.findUniqueOrThrow({ where: { id: created.memberId } });
    expect(member.status).toBe("ACTIVE");
    expect(member.archivedAt).toBeNull();
  });

  it("frees the contact on archive, and blocks reactivation if another active member took it", async () => {
    const phone = uniquePhone();
    const original = await createMember(owner, mk({ phone }));
    await archiveMember(owner, original.memberId ?? "");
    // The contact is now reusable by a new active member (INV-3 is non-archived only).
    expect((await createMember(owner, mk({ phone }))).status).toBe("success");
    // Reactivating the original would now collide → surfaced, not a 500.
    const reactivated = await reactivateMember(owner, original.memberId ?? "");
    expect(reactivated.status).toBe("error");
  });

  it("denies archive without members.archive", async () => {
    const created = await createMember(owner, mk());
    await expect(archiveMember(noPerms, created.memberId ?? "")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  // ARC-3 / INV-11 — deferred to Epic D (Memberships/Billing own these queries). See the
  // service `assertArchivable` seam; both preconditions are vacuously satisfied in Epic 2.
  it.todo("rejects archive when the member has an Active or Scheduled membership (ARC-3)");
  it.todo("rejects archive when the member has an Outstanding Balance (ARC-3)");
});

describe("responsible trainer assignment (ASN-1/2/3, INV-35/36)", () => {
  it("assigns, then reassigns keeping exactly one open assignment (INV-35)", async () => {
    const created = await createMember(owner, mk());
    const memberId = created.memberId ?? "";

    expect((await assignTrainer(owner, memberId, { trainerGymUserId: trainerA })).status).toBe(
      "success",
    );
    let detail = await getMember(owner, memberId);
    expect(detail.trainerGymUserId).toBe(trainerA);

    expect((await assignTrainer(owner, memberId, { trainerGymUserId: trainerB })).status).toBe(
      "success",
    );
    detail = await getMember(owner, memberId);
    expect(detail.trainerGymUserId).toBe(trainerB);

    const open = await prisma.trainerAssignment.count({ where: { memberId, unassignedAt: null } });
    expect(open).toBe(1);
  });

  it("unassigns the current trainer", async () => {
    const created = await createMember(owner, mk());
    const memberId = created.memberId ?? "";
    await assignTrainer(owner, memberId, { trainerGymUserId: trainerA });
    expect((await unassignTrainer(owner, memberId)).status).toBe("success");
    const detail = await getMember(owner, memberId);
    expect(detail.trainerGymUserId).toBeNull();
  });

  it("rejects a trainer from another gym as 404 (INV-36 + tenancy)", async () => {
    const created = await createMember(owner, mk());
    await expect(
      assignTrainer(owner, created.memberId ?? "", { trainerGymUserId: crossGymTrainer }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("denies assignment without assignments.manage", async () => {
    const created = await createMember(owner, mk());
    await expect(
      assignTrainer(noPerms, created.memberId ?? "", { trainerGymUserId: trainerA }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("denies listing assignable trainers without assignments.manage", async () => {
    await expect(listAssignableTrainers(noPerms)).rejects.toBeInstanceOf(AuthorizationError);
  });
});
