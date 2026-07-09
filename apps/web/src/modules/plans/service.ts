import { prisma, Prisma } from "@pulse/db";
import { PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal } from "@pulse/types";
import { authorize } from "@/lib/auth/assert";
import { assertSameGym } from "@/lib/tenancy";
import { NotFoundError } from "@/lib/errors";
import { parseAmountToMinor } from "@/lib/money";
import { PlanSchema, type PlanInput, type PlanListParams, DURATION_UNITS } from "./validation";

/**
 * Plan Management domain service (Sprint-1 Epic-3) — the testable core of the mutation
 * pipeline: **authorize (by permission) → validate (Zod) → scope (gymId from session) →
 * execute → (revalidate in the action)**. Every function takes an explicit `principal`.
 *
 * Money: a plan's price is stored as exact integer minor units (`BigInt`) in the gym's
 * currency (money-rules M-1; currency snapshotted at create, unchanged on edit). The
 * user-entered major-unit string is parsed to minor units **here** (the single parse
 * authority); over-precision for the currency surfaces as a price field error. `BigInt`
 * never crosses to the client — view models expose `priceMinor` as a string.
 *
 * Status: "Active/Archived" is `Plan.isActive` (PLN-2 active⇄inactive/retired; PLN-4
 * retired-never-destroyed). `plans.deactivate` gates both archive and restore. Tenancy:
 * load-by-id then `assertSameGym` → cross-gym is 404, never 403 (error-handling.md).
 */

export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export interface CreatePlanResult extends ActionState {
  planId?: string;
}

type DurationUnit = (typeof DURATION_UNITS)[number];

const PAGE_SIZE = 20;

export interface PlanRow {
  id: string;
  name: string;
  /** Exact minor units as a string (BigInt is not client-serializable). */
  priceMinor: string;
  currency: string;
  durationValue: number;
  durationUnit: DurationUnit;
  isActive: boolean;
  description: string | null;
}

export interface PlanDetail extends PlanRow {
  createdAt: Date;
}

export interface PlanListResult {
  rows: PlanRow[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

type PlanRecord = Prisma.PlanGetPayload<object>;

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listPlans(
  principal: AuthenticatedPrincipal,
  params: PlanListParams,
): Promise<PlanListResult> {
  authorize(principal, PERMISSION_KEYS.PLANS_READ);

  const where: Prisma.PlanWhereInput = { gymId: principal.gymId };
  if (params.status === "ACTIVE") where.isActive = true;
  else if (params.status === "ARCHIVED") where.isActive = false;
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const total = await prisma.plan.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(params.page, totalPages);
  const rows = await prisma.plan.findMany({
    where,
    orderBy: { name: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return { rows: rows.map(toRow), total, page, totalPages, pageSize: PAGE_SIZE };
}

export async function getPlan(
  principal: AuthenticatedPrincipal,
  planId: string,
): Promise<PlanDetail> {
  authorize(principal, PERMISSION_KEYS.PLANS_READ);
  const plan = await loadOwnedPlan(principal, planId);
  return { ...toRow(plan), createdAt: plan.createdAt };
}

/** The gym's default currency — the currency a new plan's price is entered/stored in. */
export async function getGymCurrency(principal: AuthenticatedPrincipal): Promise<string> {
  authorize(principal, PERMISSION_KEYS.PLANS_READ);
  const gym = await prisma.gym.findUnique({
    where: { id: principal.gymId },
    select: { defaultCurrency: true },
  });
  if (!gym) throw new NotFoundError();
  return gym.defaultCurrency;
}

// ── Commands ─────────────────────────────────────────────────────────────────

export async function createPlan(
  principal: AuthenticatedPrincipal,
  input: unknown,
): Promise<CreatePlanResult> {
  authorize(principal, PERMISSION_KEYS.PLANS_CREATE);
  const parsed = PlanSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const currency = await getGymDefaultCurrency(principal.gymId);
  const price = parsePrice(parsed.data.price, currency);
  if (price === null) return priceError(currency);

  const plan = await prisma.plan.create({
    data: {
      gymId: principal.gymId,
      createdById: principal.userId,
      currency,
      price,
      ...toData(parsed.data),
    },
    select: { id: true },
  });
  return { status: "success", planId: plan.id };
}

export async function updatePlan(
  principal: AuthenticatedPrincipal,
  planId: string,
  input: unknown,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.PLANS_UPDATE);
  const existing = await loadOwnedPlan(principal, planId);
  const parsed = PlanSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  // Currency is the plan's snapshot — never changed on edit (multi-currency is out of scope).
  const price = parsePrice(parsed.data.price, existing.currency);
  if (price === null) return priceError(existing.currency);

  await prisma.plan.update({
    where: { id: planId },
    data: { price, ...toData(parsed.data) },
  });
  return { status: "success" };
}

export async function archivePlan(
  principal: AuthenticatedPrincipal,
  planId: string,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.PLANS_DEACTIVATE);
  await loadOwnedPlan(principal, planId);
  await prisma.plan.update({ where: { id: planId }, data: { isActive: false } });
  return { status: "success" };
}

export async function restorePlan(
  principal: AuthenticatedPrincipal,
  planId: string,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.PLANS_DEACTIVATE);
  await loadOwnedPlan(principal, planId);
  await prisma.plan.update({ where: { id: planId }, data: { isActive: true } });
  return { status: "success" };
}

// ── helpers ────────────────────────────────────────────────────────────────

async function loadOwnedPlan(
  principal: AuthenticatedPrincipal,
  planId: string,
): Promise<PlanRecord> {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError();
  assertSameGym(principal.gymId, plan.gymId);
  return plan;
}

async function getGymDefaultCurrency(gymId: string): Promise<string> {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { defaultCurrency: true },
  });
  if (!gym) throw new NotFoundError();
  return gym.defaultCurrency;
}

/** Parse the major-unit price string to exact minor units; null = over-precise/invalid. */
function parsePrice(price: string, currency: string): bigint | null {
  try {
    return parseAmountToMinor(price, currency);
  } catch {
    return null;
  }
}

function priceError(currency: string): ActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors: { price: [`Enter a valid ${currency} amount with the right number of decimals.`] },
  };
}

/** The 5 user-writable plan fields (name + duration + description); price/currency handled
 *  separately, status/tier/archivedAt never written from a form. */
function toData(input: PlanInput): {
  name: string;
  description: string | null;
  durationValue: number;
  durationUnit: DurationUnit;
} {
  return {
    name: input.name,
    description: input.description,
    durationValue: input.durationValue,
    durationUnit: input.durationUnit,
  };
}

function toRow(plan: PlanRecord): PlanRow {
  return {
    id: plan.id,
    name: plan.name,
    priceMinor: plan.price.toString(),
    currency: plan.currency,
    durationValue: plan.durationValue,
    durationUnit: plan.durationUnit as DurationUnit,
    isActive: plan.isActive,
    description: plan.description,
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
