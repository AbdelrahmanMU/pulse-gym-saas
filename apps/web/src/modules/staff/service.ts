import { prisma, Prisma } from "@pulse/db";
import { PERMISSION_KEYS } from "@pulse/auth";
import { hashPassword } from "@pulse/auth/password";
import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { authorize } from "@/lib/auth/assert";
import { assertSameGym } from "@/lib/tenancy";
import { NotFoundError } from "@/lib/errors";
import { systemClock } from "@/lib/platform/clock";
import { unassignAllForTrainer } from "@/modules/members";
import {
  AssignRoleSchema,
  CreateStaffSchema,
  UpdateStaffSchema,
  type StaffListParams,
} from "./validation";

/**
 * User & Staff Management domain service (Sprint-1 Epic-9) — the testable core of the mutation
 * pipeline: **authorize (by permission) → validate (Zod) → scope (gymId from session) → execute →
 * (revalidate in the action)**. Every function takes an explicit `principal`; the thin `"use server"`
 * actions and RSC queries resolve it and delegate here.
 *
 * A staff member is a {@link GymUser} linking a {@link User} to the gym via a {@link Role}. The
 * lifecycle is the **documented** `ACTIVE ⇄ REVOKED` (there is no Pending/Archived state — see the
 * Epic-9 brief D-1); "Suspend" sets `REVOKED` (+ `revokedAt`) and "Reactivate" restores `ACTIVE`.
 * Suspend already blocks sign-in (the credentials resolver gates on `status == ACTIVE`).
 *
 * Tenancy: a `GymUser` is loaded by id then `assertSameGym` → cross-gym is {@link NotFoundError}
 * (404, never 403). Email uniqueness is a DB `@unique` → Prisma P2002 mapped to the email field.
 * Suspending a trainer clears their open member assignments (INV-36) via the members public read.
 */

export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export interface CreateStaffResult extends ActionState {
  gymUserId?: string;
}

const PAGE_SIZE = 20;

export type StaffStatus = "ACTIVE" | "REVOKED";

export interface StaffRow {
  id: string; // GymUser id
  userId: string;
  displayName: string;
  email: string;
  phone: string | null;
  status: StaffStatus;
  roleId: string;
  roleName: string;
  roleKey: string;
  lastLoginAt: Date | null;
  revokedAt: Date | null;
}

export interface StaffDetail extends StaffRow {
  createdAt: Date;
  /** True when this row is the acting principal's own account (guards self-lockout in the UI). */
  isSelf: boolean;
}

export interface StaffListResult {
  rows: StaffRow[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

export interface RoleOption {
  id: string;
  key: string;
  name: string;
}

const staffInclude = {
  user: {
    select: { id: true, displayName: true, email: true, phone: true, lastLoginAt: true },
  },
  role: { select: { name: true, key: true } },
} satisfies Prisma.GymUserInclude;

type GymUserWithRelations = Prisma.GymUserGetPayload<{ include: typeof staffInclude }>;

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listStaff(
  principal: AuthenticatedPrincipal,
  params: StaffListParams,
): Promise<StaffListResult> {
  authorize(principal, PERMISSION_KEYS.STAFF_READ);

  const where: Prisma.GymUserWhereInput = { gymId: principal.gymId };
  if (params.status !== "ALL") where.status = params.status;
  if (params.q) {
    where.user = {
      OR: [
        { displayName: { contains: params.q, mode: "insensitive" } },
        { email: { contains: params.q, mode: "insensitive" } },
      ],
    };
  }

  const total = await prisma.gymUser.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(params.page, totalPages);
  const rows = await prisma.gymUser.findMany({
    where,
    include: staffInclude,
    orderBy: { user: { displayName: "asc" } },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return { rows: rows.map(toRow), total, page, totalPages, pageSize: PAGE_SIZE };
}

export async function getStaff(
  principal: AuthenticatedPrincipal,
  gymUserId: string,
): Promise<StaffDetail> {
  authorize(principal, PERMISSION_KEYS.STAFF_READ);
  const staff = await loadOwnedStaff(principal, gymUserId);
  return {
    ...toRow(staff),
    createdAt: staff.createdAt,
    isSelf: staff.id === principal.gymUserId,
  };
}

/** Assignable roles for the create/assign controls (platform catalog roles that are assignable). */
export async function listAssignableRoles(
  principal: AuthenticatedPrincipal,
): Promise<RoleOption[]> {
  authorize(principal, PERMISSION_KEYS.STAFF_READ);
  const roles = await prisma.role.findMany({
    where: { gymId: null, isAssignable: true },
    select: { id: true, key: true, name: true },
    orderBy: { name: "asc" },
  });
  return roles;
}

// ── Commands ─────────────────────────────────────────────────────────────────

export async function createStaff(
  principal: AuthenticatedPrincipal,
  input: unknown,
): Promise<CreateStaffResult> {
  authorize(principal, PERMISSION_KEYS.STAFF_INVITE);
  const parsed = CreateStaffSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const role = await loadAssignableRole(principal.gymId, parsed.data.roleId);
  if (!role) return fieldError("roleId", "Choose a valid role.");

  const passwordHash = await hashPassword(parsed.data.temporaryPassword);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: parsed.data.email,
          displayName: parsed.data.displayName,
          phone: parsed.data.phone,
          passwordHash,
          isActive: true,
        },
        select: { id: true },
      });
      const gymUser = await tx.gymUser.create({
        data: {
          gymId: principal.gymId,
          userId: user.id,
          roleId: role.id,
          status: "ACTIVE",
          createdById: principal.userId,
        },
        select: { id: true },
      });
      return gymUser.id;
    });
    return { status: "success", gymUserId: created };
  } catch (error) {
    return emailConflict(error) ?? rethrow(error);
  }
}

export async function updateStaff(
  principal: AuthenticatedPrincipal,
  gymUserId: string,
  input: unknown,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.STAFF_MANAGE);
  const staff = await loadOwnedStaff(principal, gymUserId);
  const parsed = UpdateStaffSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  await prisma.user.update({
    where: { id: staff.userId },
    data: { displayName: parsed.data.displayName, phone: parsed.data.phone },
  });
  return { status: "success" };
}

export async function assignRole(
  principal: AuthenticatedPrincipal,
  gymUserId: string,
  input: unknown,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.ROLES_MANAGE);
  const staff = await loadOwnedStaff(principal, gymUserId);
  const parsed = AssignRoleSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  // Self-lockout guard: an actor can't change their own role (could strip their own access).
  if (staff.id === principal.gymUserId) {
    return { status: "error", message: "You can't change your own role." };
  }

  const role = await loadAssignableRole(principal.gymId, parsed.data.roleId);
  if (!role) return fieldError("roleId", "Choose a valid role.");

  await prisma.gymUser.update({ where: { id: staff.id }, data: { roleId: role.id } });
  return { status: "success" };
}

export async function suspendStaff(
  principal: AuthenticatedPrincipal,
  gymUserId: string,
  clock: IClock = systemClock,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.STAFF_MANAGE);
  const staff = await loadOwnedStaff(principal, gymUserId);

  // Self-lockout guard: an actor can't suspend their own account.
  if (staff.id === principal.gymUserId) {
    return { status: "error", message: "You can't suspend your own account." };
  }
  if (staff.status === "REVOKED") return { status: "success" }; // idempotent

  await prisma.gymUser.update({
    where: { id: staff.id },
    data: { status: "REVOKED", revokedAt: clock.now() },
  });

  // INV-36 revoke side: clear this trainer's open member assignments so no member points at a
  // suspended trainer. Sequential (a REVOKED trainer can't act, so the window is benign); the
  // members module owns the assignment write (composed via its public index).
  await unassignAllForTrainer(principal, staff.id, clock);
  return { status: "success" };
}

export async function reactivateStaff(
  principal: AuthenticatedPrincipal,
  gymUserId: string,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.STAFF_MANAGE);
  const staff = await loadOwnedStaff(principal, gymUserId);
  if (staff.status === "ACTIVE") return { status: "success" }; // idempotent
  await prisma.gymUser.update({
    where: { id: staff.id },
    data: { status: "ACTIVE", revokedAt: null },
  });
  return { status: "success" };
}

// ── helpers ────────────────────────────────────────────────────────────────

/** Load a GymUser by id and prove it belongs to the actor's gym (cross-gym → 404). */
async function loadOwnedStaff(
  principal: AuthenticatedPrincipal,
  gymUserId: string,
): Promise<GymUserWithRelations> {
  const staff = await prisma.gymUser.findUnique({
    where: { id: gymUserId },
    include: staffInclude,
  });
  if (!staff) throw new NotFoundError();
  assertSameGym(principal.gymId, staff.gymId);
  return staff;
}

/** A platform (catalog) role that is currently assignable, or null (unknown/dormant/cross-tenant). */
async function loadAssignableRole(gymId: string, roleId: string) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, gymId: true, isAssignable: true },
  });
  // Assignable platform roles have gymId null; a non-null gymId must match the actor's gym.
  if (!role || !role.isAssignable) return null;
  if (role.gymId !== null && role.gymId !== gymId) return null;
  return role;
}

function toRow(staff: GymUserWithRelations): StaffRow {
  return {
    id: staff.id,
    userId: staff.user.id,
    displayName: staff.user.displayName,
    email: staff.user.email,
    phone: staff.user.phone,
    status: staff.status === "REVOKED" ? "REVOKED" : "ACTIVE",
    roleId: staff.roleId,
    roleName: staff.role.name,
    roleKey: staff.role.key,
    lastLoginAt: staff.user.lastLoginAt,
    revokedAt: staff.revokedAt,
  };
}

function invalid(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): ActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

function fieldError(field: string, message: string): ActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors: { [field]: [message] },
  };
}

/** Map a Prisma unique-violation on `User.email` to a field error. */
function emailConflict(error: unknown): ActionState | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return null;
  }
  return fieldError("email", "A user with this email already exists.");
}

function rethrow(error: unknown): never {
  throw error;
}
