import { prisma, Prisma } from "@pulse/db";
import { PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { authorize } from "@/lib/auth/assert";
import { assertSameGym } from "@/lib/tenancy";
import { NotFoundError } from "@/lib/errors";
import { systemClock } from "@/lib/platform/clock";
import { BranchSchema, GymSettingsSchema, OwnProfileSchema, type BranchInput } from "./validation";

/**
 * Gym Initialization domain service (Sprint-1 Epic-1) — the testable core of the
 * mutation pipeline: **authorize (by permission) → validate (Zod) → scope (gymId/userId)
 * → execute**. Every function takes an explicit `principal` (never reads the ambient
 * session) so it is unit/integration-testable; the thin "use server" actions and RSC
 * queries resolve the principal and delegate here.
 *
 * Authorization throws typed errors (AuthError 401 / AuthorizationError 403); cross-tenant
 * access throws NotFoundError (404, never 403 — error-handling.md). User-input failures
 * return a structured {@link ActionState} for inline display. Time comes from the injected
 * {@link IClock} (T-26), never `new Date()` (T-27 platform-adapter rule).
 */

export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export interface GymSettingsView {
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  defaultCurrency: string;
  timeZone: string;
  expiringSoonWindowDays: number;
  gracePeriodDays: number;
  setupCompletedAt: Date | null;
}

export interface BranchView {
  id: string;
  name: string;
  contactPhone: string | null;
  address: BranchInput["address"];
  isActive: boolean;
}

export interface ProfileView {
  displayName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getGymSettings(principal: AuthenticatedPrincipal): Promise<GymSettingsView> {
  authorize(principal, PERMISSION_KEYS.GYM_VIEW);
  const gym = await prisma.gym.findUnique({ where: { id: principal.gymId } });
  if (!gym) throw new NotFoundError();
  return {
    name: gym.name,
    contactEmail: gym.contactEmail,
    contactPhone: gym.contactPhone,
    defaultCurrency: gym.defaultCurrency,
    timeZone: gym.timeZone,
    expiringSoonWindowDays: gym.expiringSoonWindowDays,
    gracePeriodDays: gym.gracePeriodDays,
    setupCompletedAt: gym.setupCompletedAt,
  };
}

export async function getDefaultBranch(principal: AuthenticatedPrincipal): Promise<BranchView> {
  authorize(principal, PERMISSION_KEYS.BRANCHES_READ);
  const branch = await prisma.branch.findUnique({ where: { id: principal.branchId } });
  if (!branch) throw new NotFoundError();
  assertSameGym(principal.gymId, branch.gymId);
  return toBranchView(branch);
}

export async function getMyProfile(principal: AuthenticatedPrincipal): Promise<ProfileView> {
  // Self-ownership: no permission — a user always reads their own identity.
  const user = await prisma.user.findUnique({ where: { id: principal.userId } });
  if (!user) throw new NotFoundError();
  return {
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
  };
}

// ── Commands ─────────────────────────────────────────────────────────────────

export async function updateGymSettings(
  principal: AuthenticatedPrincipal,
  input: unknown,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.GYM_MANAGE);
  const parsed = GymSettingsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  await prisma.gym.update({ where: { id: principal.gymId }, data: parsed.data });
  return { status: "success" };
}

export async function updateDefaultBranch(
  principal: AuthenticatedPrincipal,
  branchId: string,
  input: unknown,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.BRANCHES_MANAGE);
  // Load by id + assert same gym → cross-tenant surfaces as 404 (real isolation guard).
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new NotFoundError();
  assertSameGym(principal.gymId, branch.gymId);

  const parsed = BranchSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { name, contactPhone, isActive, address } = parsed.data;
  await prisma.branch.update({
    where: { id: branch.id },
    data: { name, contactPhone, isActive, address: toAddressJson(address) },
  });
  return { status: "success" };
}

export async function updateMyProfile(
  principal: AuthenticatedPrincipal,
  input: unknown,
): Promise<ActionState> {
  // Self-ownership: the operation targets principal.userId ONLY — no target id is
  // accepted, so a user can never edit another (un-trickable by construction). User is
  // a global entity → scoped by userId, never gymId.
  const parsed = OwnProfileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  await prisma.user.update({ where: { id: principal.userId }, data: parsed.data });
  return { status: "success" };
}

/** Mark the gym's first-run setup complete (onboarding terminal step). */
export async function completeOnboarding(
  principal: AuthenticatedPrincipal,
  clock: IClock = systemClock,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.GYM_MANAGE);
  await prisma.gym.update({
    where: { id: principal.gymId },
    data: { setupCompletedAt: clock.now() },
  });
  return { status: "success" };
}

// ── helpers ────────────────────────────────────────────────────────────────

function invalid(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): ActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

/** Store only the populated address fields as clean JSON; empty → SQL NULL (DbNull). */
function toAddressJson(
  address: BranchInput["address"],
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const entries = Object.entries(address).filter(([, v]) => v !== null && v !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : Prisma.DbNull;
}

function toBranchView(branch: {
  id: string;
  name: string;
  contactPhone: string | null;
  address: unknown;
  isActive: boolean;
}): BranchView {
  const parsed = BranchSchema.shape.address.safeParse(branch.address ?? {});
  return {
    id: branch.id,
    name: branch.name,
    contactPhone: branch.contactPhone,
    address: parsed.success
      ? parsed.data
      : { line1: null, line2: null, city: null, region: null, postalCode: null, country: null },
    isActive: branch.isActive,
  };
}
