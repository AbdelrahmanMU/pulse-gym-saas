import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@pulse/db";
import { ALL_PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal } from "@pulse/types";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { resolvePrincipalFromCredentials } from "@/lib/auth/principal";
import { assignTrainer, getMember } from "@/modules/members/service";
import {
  assignRole,
  createStaff,
  getStaff,
  listStaff,
  reactivateStaff,
  suspendStaff,
  updateStaff,
} from "@/modules/staff/service";

/**
 * Integration P0 tests for User & Staff Management (Sprint-1 Epic-9) against the isolated test DB.
 * The service core takes an explicit `principal`, so authorization is proven **by permission**
 * (allow AND deny) and tenancy with a real second gym. Covers the mandatory gates: tenant isolation
 * (cross-gym → 404), permission gating per action, the documented `ACTIVE ⇄ REVOKED` lifecycle
 * (suspend/reactivate, idempotent, self-lockout guard), the INV-36 revoke side (a suspended trainer's
 * assignments are cleared), email uniqueness, and the auth reuse — a created staff member can sign in
 * (which stamps `lastLoginAt`) and a suspended one cannot.
 */
let owner: AuthenticatedPrincipal;
let noPerms: AuthenticatedPrincipal;
let ownerGymId: string;
let ownerBranchId: string;
let trainerRoleId: string;
let otherGymId: string;
let foreignGymUserId: string;

let seq = 0;
const uniqueEmail = (): string => `staff-${Date.now()}-${seq++}@pulse.test`;

const mkStaff = (over: Record<string, unknown> = {}) => ({
  displayName: "New Staffer",
  email: uniqueEmail(),
  phone: "",
  roleId: trainerRoleId,
  temporaryPassword: "TempPass123",
  ...over,
});

beforeAll(async () => {
  const ownerUser = await prisma.user.findUniqueOrThrow({ where: { email: "owner@pulse.local" } });
  const gymUser = await prisma.gymUser.findFirstOrThrow({ where: { userId: ownerUser.id } });
  const branch = await prisma.branch.findFirstOrThrow({ where: { gymId: gymUser.gymId } });
  ownerGymId = gymUser.gymId;
  ownerBranchId = branch.id;
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

  trainerRoleId = (await prisma.role.findFirstOrThrow({ where: { gymId: null, key: "trainer" } }))
    .id;

  const otherGym = await prisma.gym.create({
    data: { name: "Rival Gym", defaultCurrency: "USD", timeZone: "UTC" },
  });
  otherGymId = otherGym.id;
  // A staff member in another gym for isolation tests.
  const foreignUser = await prisma.user.create({
    data: { email: uniqueEmail(), displayName: "Foreign Staff", passwordHash: "!x" },
  });
  foreignGymUserId = (
    await prisma.gymUser.create({
      data: { gymId: otherGymId, userId: foreignUser.id, roleId: trainerRoleId, status: "ACTIVE" },
    })
  ).id;
});

describe("create — pipeline, permission, contract", () => {
  it("creates a User + GymUser scoped to the actor's gym, ACTIVE, with a hashed password", async () => {
    const input = mkStaff({ displayName: "Ada Trainer" });
    const result = await createStaff(owner, input);
    expect(result.status).toBe("success");
    const gymUser = await prisma.gymUser.findUniqueOrThrow({
      where: { id: result.gymUserId },
      include: { user: true },
    });
    expect(gymUser.gymId).toBe(ownerGymId);
    expect(gymUser.status).toBe("ACTIVE");
    expect(gymUser.roleId).toBe(trainerRoleId);
    expect(gymUser.createdById).toBe(owner.userId);
    expect(gymUser.user.passwordHash).toMatch(/^scrypt\$/); // hashed, never plaintext
    expect(gymUser.user.passwordHash).not.toContain("TempPass123");
  });

  it("denies create without staff.invite (by permission, not role)", async () => {
    await expect(createStaff(noPerms, mkStaff())).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("rejects a duplicate email as a field error (User.email unique)", async () => {
    const email = uniqueEmail();
    expect((await createStaff(owner, mkStaff({ email }))).status).toBe("success");
    const dup = await createStaff(owner, mkStaff({ email }));
    expect(dup.status).toBe("error");
    if (dup.status === "error") expect(dup.fieldErrors?.email).toBeTruthy();
  });

  it("rejects a non-assignable / unknown role as a field error", async () => {
    const dormant = await prisma.role.findFirst({ where: { gymId: null, isAssignable: false } });
    if (dormant) {
      const res = await createStaff(owner, mkStaff({ roleId: dormant.id }));
      expect(res.status).toBe("error");
      if (res.status === "error") expect(res.fieldErrors?.roleId).toBeTruthy();
    }
  });

  it("rejects a too-short temporary password (validation)", async () => {
    const res = await createStaff(owner, mkStaff({ temporaryPassword: "short" }));
    expect(res.status).toBe("error");
    if (res.status === "error") expect(res.fieldErrors?.temporaryPassword).toBeTruthy();
  });
});

describe("list & get — tenant isolation and permission", () => {
  it("lists only the actor's gym staff, filtered and searchable", async () => {
    const tag = `List-${Date.now()}`;
    await createStaff(owner, mkStaff({ displayName: `${tag} Person` }));
    const result = await listStaff(owner, { status: "ALL", page: 1, q: tag });
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.displayName).toBe(`${tag} Person`);
    expect(result.rows.every((r) => r.status === "ACTIVE" || r.status === "REVOKED")).toBe(true);
  });

  it("denies listing without staff.read", async () => {
    await expect(
      listStaff(noPerms, { status: "ACTIVE", page: 1, q: undefined }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("surfaces a cross-gym staff member as 404 (never 403)", async () => {
    await expect(getStaff(owner, foreignGymUserId)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("update & role assignment", () => {
  it("updates a staff member's name and phone", async () => {
    const created = await createStaff(owner, mkStaff({ displayName: "Before" }));
    const res = await updateStaff(owner, created.gymUserId ?? "", {
      displayName: "After",
      phone: "+1555000",
    });
    expect(res.status).toBe("success");
    const detail = await getStaff(owner, created.gymUserId ?? "");
    expect(detail.displayName).toBe("After");
    expect(detail.phone).toBe("+1555000");
  });

  it("denies update without staff.manage", async () => {
    const created = await createStaff(owner, mkStaff());
    await expect(
      updateStaff(noPerms, created.gymUserId ?? "", { displayName: "X", phone: "" }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("assigns a role, and blocks changing your own role (self-lockout guard)", async () => {
    const ownerRoleId = (
      await prisma.role.findFirstOrThrow({ where: { gymId: null, key: "owner" } })
    ).id;
    const created = await createStaff(owner, mkStaff());
    const res = await assignRole(owner, created.gymUserId ?? "", { roleId: ownerRoleId });
    expect(res.status).toBe("success");
    expect((await getStaff(owner, created.gymUserId ?? "")).roleKey).toBe("owner");

    const self = await assignRole(owner, owner.gymUserId, { roleId: trainerRoleId });
    expect(self.status).toBe("error");
  });

  it("denies role assignment without roles.manage", async () => {
    const created = await createStaff(owner, mkStaff());
    await expect(
      assignRole(noPerms, created.gymUserId ?? "", { roleId: trainerRoleId }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("lifecycle — suspend / reactivate (ACTIVE ⇄ REVOKED) + INV-36", () => {
  it("suspends a staff member (REVOKED + revokedAt) and reactivates them (idempotent both ways)", async () => {
    const created = await createStaff(owner, mkStaff());
    const id = created.gymUserId ?? "";

    expect((await suspendStaff(owner, id)).status).toBe("success");
    let gu = await prisma.gymUser.findUniqueOrThrow({ where: { id } });
    expect(gu.status).toBe("REVOKED");
    expect(gu.revokedAt).not.toBeNull();
    expect((await suspendStaff(owner, id)).status).toBe("success"); // idempotent

    expect((await reactivateStaff(owner, id)).status).toBe("success");
    gu = await prisma.gymUser.findUniqueOrThrow({ where: { id } });
    expect(gu.status).toBe("ACTIVE");
    expect(gu.revokedAt).toBeNull();
    expect((await reactivateStaff(owner, id)).status).toBe("success"); // idempotent
  });

  it("clears a suspended trainer's open member assignments (INV-36 revoke side)", async () => {
    const staff = await createStaff(owner, mkStaff({ displayName: "Coach" }));
    const trainerGymUserId = staff.gymUserId ?? "";
    const member = await prisma.member.create({
      data: {
        gymId: ownerGymId,
        branchId: ownerBranchId,
        fullName: "Coached",
        phone: uniqueEmail(),
      },
    });
    await assignTrainer(owner, member.id, { trainerGymUserId });
    expect((await getMember(owner, member.id)).trainerGymUserId).toBe(trainerGymUserId);

    expect((await suspendStaff(owner, trainerGymUserId)).status).toBe("success");
    expect((await getMember(owner, member.id)).trainerGymUserId).toBeNull(); // cleared
  });

  it("blocks suspending your own account (self-lockout guard)", async () => {
    const res = await suspendStaff(owner, owner.gymUserId);
    expect(res.status).toBe("error");
    const gu = await prisma.gymUser.findUniqueOrThrow({ where: { id: owner.gymUserId } });
    expect(gu.status).toBe("ACTIVE");
  });

  it("denies suspend without staff.manage", async () => {
    const created = await createStaff(owner, mkStaff());
    await expect(suspendStaff(noPerms, created.gymUserId ?? "")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
});

describe("authentication reuse — sign-in stamps lastLoginAt; suspend blocks sign-in", () => {
  it("a created staff member can sign in, and sign-in records lastLoginAt", async () => {
    const email = uniqueEmail();
    const created = await createStaff(owner, mkStaff({ email, temporaryPassword: "TempPass123" }));
    const principal = await resolvePrincipalFromCredentials({ email, password: "TempPass123" });
    expect(principal).not.toBeNull();
    expect(principal?.gymId).toBe(ownerGymId);
    const user = await prisma.user.findFirstOrThrow({ where: { email } });
    expect(user.lastLoginAt).not.toBeNull();
    void created;
  });

  it("a suspended staff member cannot sign in", async () => {
    const email = uniqueEmail();
    const created = await createStaff(owner, mkStaff({ email, temporaryPassword: "TempPass123" }));
    await suspendStaff(owner, created.gymUserId ?? "");
    const principal = await resolvePrincipalFromCredentials({ email, password: "TempPass123" });
    expect(principal).toBeNull();
  });
});
