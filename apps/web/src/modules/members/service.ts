import { prisma, Prisma } from "@pulse/db";
import { PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { authorize } from "@/lib/auth/assert";
import { assertSameGym } from "@/lib/tenancy";
import { NotFoundError } from "@/lib/errors";
import { systemClock } from "@/lib/platform/clock";
import {
  AssignTrainerSchema,
  MemberSchema,
  type MemberInput,
  type MemberListParams,
} from "./validation";

/**
 * Member Management domain service (Sprint-1 Epic-2) — the testable core of the mutation
 * pipeline: **authorize (by permission) → validate (Zod) → scope (gymId from session) →
 * execute → (revalidate in the action)**. Every function takes an explicit `principal`
 * (never the ambient session) so it is integration-testable; the thin `"use server"`
 * actions and RSC queries resolve the principal and delegate here.
 *
 * Tenancy: a tenant-owned row is loaded by id then `assertSameGym` — a cross-gym row
 * surfaces as {@link NotFoundError} (404, never 403; error-handling.md). DB-enforced
 * invariants surface as field errors: INV-3 (contact unique per gym) is a partial-unique
 * index → Prisma P2002 is mapped to the phone/email field. Time comes from the injected
 * {@link IClock} (T-26/T-27), never `new Date()`.
 */

export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

/** create returns the new id so the action can redirect to the member's profile. */
export interface CreateMemberResult extends ActionState {
  memberId?: string;
}

const PAGE_SIZE = 20;

export interface MemberRow {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: "ACTIVE" | "ARCHIVED";
  joinedOn: Date | null;
  trainerName: string | null;
}

export interface MemberDetail extends MemberRow {
  dateOfBirth: Date | null;
  gender: string | null;
  createdAt: Date;
  /** The GymUser id of the current responsible trainer (open assignment), if any. */
  trainerGymUserId: string | null;
}

export interface MemberListResult {
  rows: MemberRow[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

export interface TrainerOption {
  gymUserId: string;
  name: string;
}

// The current (open) trainer assignment + its staff display name, in one include.
const currentTrainerInclude = {
  trainerAssignments: {
    where: { unassignedAt: null },
    take: 1,
    include: { trainer: { include: { user: { select: { displayName: true } } } } },
  },
} satisfies Prisma.MemberInclude;

type MemberWithTrainer = Prisma.MemberGetPayload<{ include: typeof currentTrainerInclude }>;

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listMembers(
  principal: AuthenticatedPrincipal,
  params: MemberListParams,
): Promise<MemberListResult> {
  authorize(principal, PERMISSION_KEYS.MEMBERS_READ);

  const where: Prisma.MemberWhereInput = { gymId: principal.gymId };
  if (params.status !== "ALL") where.status = params.status;
  if (params.q) {
    where.OR = [
      { fullName: { contains: params.q, mode: "insensitive" } },
      { phone: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.trainer === "UNASSIGNED") {
    where.trainerAssignments = { none: { unassignedAt: null } };
  } else if (params.trainer !== "ALL") {
    where.trainerAssignments = {
      some: { unassignedAt: null, trainerGymUserId: params.trainer },
    };
  }

  const total = await prisma.member.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(params.page, totalPages);
  const rows = await prisma.member.findMany({
    where,
    include: currentTrainerInclude,
    orderBy: { fullName: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return { rows: rows.map(toRow), total, page, totalPages, pageSize: PAGE_SIZE };
}

export async function getMember(
  principal: AuthenticatedPrincipal,
  memberId: string,
): Promise<MemberDetail> {
  authorize(principal, PERMISSION_KEYS.MEMBERS_READ);
  const member = await loadOwnedMember(principal, memberId);
  const open = member.trainerAssignments[0] ?? null;
  return {
    ...toRow(member),
    dateOfBirth: member.dateOfBirth,
    gender: member.gender,
    createdAt: member.createdAt,
    trainerGymUserId: open?.trainerGymUserId ?? null,
  };
}

/** Active staff (GymUsers) eligible to be a member's responsible trainer (ASN-2: any active
 * staff — never role-gated, which would be role-branching). The acting user needs
 * `assignments.manage` to set an assignment. */
export async function listAssignableTrainers(
  principal: AuthenticatedPrincipal,
): Promise<TrainerOption[]> {
  authorize(principal, PERMISSION_KEYS.ASSIGNMENTS_MANAGE);
  return queryActiveStaff(principal.gymId);
}

/** The same active-staff list, gated for *reading* — populates the members-list trainer
 * filter (`assignments.read`, which a Trainer holds but `assignments.manage` they don't). */
export async function listTrainerFilterOptions(
  principal: AuthenticatedPrincipal,
): Promise<TrainerOption[]> {
  authorize(principal, PERMISSION_KEYS.ASSIGNMENTS_READ);
  return queryActiveStaff(principal.gymId);
}

async function queryActiveStaff(gymId: string): Promise<TrainerOption[]> {
  const staff = await prisma.gymUser.findMany({
    where: { gymId, status: "ACTIVE" },
    include: { user: { select: { displayName: true } } },
    orderBy: { user: { displayName: "asc" } },
  });
  return staff.map((s) => ({ gymUserId: s.id, name: s.user.displayName }));
}

// ── Commands ─────────────────────────────────────────────────────────────────

export async function createMember(
  principal: AuthenticatedPrincipal,
  input: unknown,
): Promise<CreateMemberResult> {
  authorize(principal, PERMISSION_KEYS.MEMBERS_CREATE);
  const parsed = MemberSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    const member = await prisma.member.create({
      data: {
        gymId: principal.gymId,
        branchId: principal.branchId,
        createdById: principal.userId,
        ...toData(parsed.data),
      },
      select: { id: true },
    });
    return { status: "success", memberId: member.id };
  } catch (error) {
    return contactConflict(error) ?? rethrow(error);
  }
}

export async function updateMember(
  principal: AuthenticatedPrincipal,
  memberId: string,
  input: unknown,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.MEMBERS_UPDATE);
  await loadOwnedMember(principal, memberId);
  const parsed = MemberSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    await prisma.member.update({ where: { id: memberId }, data: toData(parsed.data) });
    return { status: "success" };
  } catch (error) {
    return contactConflict(error) ?? rethrow(error);
  }
}

export async function archiveMember(
  principal: AuthenticatedPrincipal,
  memberId: string,
  clock: IClock = systemClock,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.MEMBERS_ARCHIVE);
  const member = await loadOwnedMember(principal, memberId);
  assertArchivable(member);
  if (member.status === "ARCHIVED") return { status: "success" }; // idempotent
  await prisma.member.update({
    where: { id: memberId },
    data: { status: "ARCHIVED", archivedAt: clock.now() },
  });
  return { status: "success" };
}

export async function reactivateMember(
  principal: AuthenticatedPrincipal,
  memberId: string,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.MEMBERS_REACTIVATE);
  const member = await loadOwnedMember(principal, memberId);
  if (member.status === "ACTIVE") return { status: "success" }; // idempotent
  try {
    await prisma.member.update({
      where: { id: memberId },
      data: { status: "ACTIVE", archivedAt: null },
    });
    return { status: "success" };
  } catch (error) {
    // The contact partial-unique is scoped to non-archived rows (INV-3): reactivating can
    // collide if another active member now holds this phone/email. Surface, don't 500.
    const conflict = contactConflict(error);
    if (conflict) {
      return {
        status: "error",
        message:
          "Can't reactivate — another active member now uses this phone or email. Edit the contact first.",
      };
    }
    return rethrow(error);
  }
}

export async function assignTrainer(
  principal: AuthenticatedPrincipal,
  memberId: string,
  input: unknown,
  clock: IClock = systemClock,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.ASSIGNMENTS_MANAGE);
  const member = await loadOwnedMember(principal, memberId);
  const parsed = AssignTrainerSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  // The target must be an ACTIVE GymUser in the same gym (INV-36 + tenancy). A cross-gym or
  // unknown id is indistinguishable from absent → 404 (never reveal another gym's staff).
  const trainer = await prisma.gymUser.findUnique({
    where: { id: parsed.data.trainerGymUserId },
    select: { gymId: true, status: true },
  });
  if (!trainer || trainer.gymId !== principal.gymId) throw new NotFoundError();
  if (trainer.status !== "ACTIVE") {
    return { status: "error", message: "That staff member is no longer active." };
  }

  const open = member.trainerAssignments[0] ?? null;
  if (open?.trainerGymUserId === parsed.data.trainerGymUserId) return { status: "success" }; // no-op

  // INV-35: at most one open assignment per member. Close the current one and open the new
  // one atomically, or the partial-unique would reject the insert.
  await prisma.$transaction([
    prisma.trainerAssignment.updateMany({
      where: { memberId, unassignedAt: null },
      data: { unassignedAt: clock.now() },
    }),
    prisma.trainerAssignment.create({
      data: {
        gymId: principal.gymId,
        memberId,
        trainerGymUserId: parsed.data.trainerGymUserId,
        assignedById: principal.userId,
      },
    }),
  ]);
  return { status: "success" };
}

export async function unassignTrainer(
  principal: AuthenticatedPrincipal,
  memberId: string,
  clock: IClock = systemClock,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.ASSIGNMENTS_MANAGE);
  await loadOwnedMember(principal, memberId);
  await prisma.trainerAssignment.updateMany({
    where: { memberId, unassignedAt: null },
    data: { unassignedAt: clock.now() },
  });
  return { status: "success" };
}

// ── helpers ────────────────────────────────────────────────────────────────

/** Load a member by id and prove it belongs to the actor's gym (cross-gym → 404). */
async function loadOwnedMember(
  principal: AuthenticatedPrincipal,
  memberId: string,
): Promise<MemberWithTrainer> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: currentTrainerInclude,
  });
  if (!member) throw new NotFoundError();
  assertSameGym(principal.gymId, member.gymId);
  return member;
}

/**
 * ARC-3 / INV-11 archive guard. The rule rejects archiving when the member has an Active or
 * Scheduled membership OR an Outstanding Balance. Both preconditions are **deferred**: in
 * Epic 2, Memberships and Payments are out of scope and uncreatable, so both are vacuously
 * satisfied. They are wired in Epic D (Memberships/Billing), which owns membership-state and
 * the balance derivation (INV-24) — duplicating money math here would violate single
 * ownership. Tracked by `it.todo` tests naming both preconditions.
 */
function assertArchivable(_member: MemberWithTrainer): void {
  // Intentionally empty until Epic D. See doc comment above.
}

/** The member fields a user may write — plain scalar values valid for both create and update. */
interface MemberWritableData {
  fullName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  joinedOn: Date | null;
}

function toData(input: MemberInput): MemberWritableData {
  return {
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    joinedOn: input.joinedOn,
  };
}

function toRow(member: MemberWithTrainer): MemberRow {
  const open = member.trainerAssignments[0] ?? null;
  return {
    id: member.id,
    fullName: member.fullName,
    phone: member.phone,
    email: member.email,
    status: member.status,
    joinedOn: member.joinedOn,
    trainerName: open?.trainer.user.displayName ?? null,
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

/** Map a Prisma unique-violation on the contact partial-unique to a field error (INV-3). */
function contactConflict(error: unknown): ActionState | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return null;
  }
  const target = String(error.meta?.target ?? "");
  const field = target.includes("email") ? "email" : "phone";
  const label = field === "email" ? "email" : "phone number";
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors: { [field]: [`Another member already uses this ${label}.`] },
  };
}

/** Re-throw a non-conflict error so it reaches the route error boundary. */
function rethrow(error: unknown): never {
  throw error;
}
