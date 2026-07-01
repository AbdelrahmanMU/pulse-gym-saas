import {
  prisma,
  Prisma,
  MembershipStatus,
  MembershipOrigin,
  FreezeStatus,
  type DurationUnit,
} from "@pulse/db";
import { PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { authorize } from "@/lib/auth/assert";
import { assertSameGym } from "@/lib/tenancy";
import { NotFoundError } from "@/lib/errors";
import { systemClock } from "@/lib/platform/clock";
import {
  addDays,
  dayDiff,
  fromDbDate,
  inclusiveEndDate,
  isAfter,
  maxDate,
  toDbDate,
  type IsoDate,
} from "./dates";
import {
  deriveMemberLifecycle,
  pickExpiryEvent,
  type DerivedMembership,
  type ExpiryEvent,
  type MembershipFacts,
} from "./lifecycle";
import {
  CreateMembershipSchema,
  FreezeMembershipSchema,
  UpgradeMembershipSchema,
  type MembershipListParams,
} from "./validation";

/**
 * Membership Lifecycle domain service (Sprint-1 Epic-4) — the testable core of the mutation
 * pipeline: **authorize (by permission) → validate (Zod) → scope (gymId) → execute → revalidate
 * (in the action)**. Every function takes an explicit `principal` and an injectable `IClock`
 * (T-26/27 — never `new Date()` here). Time is judged in the **gym time zone**.
 *
 * Status is **DERIVED** (`lifecycle.ts`), never trusted from `cached_status`. The write-path
 * invariants — INV-12 (≤1 ACTIVE, ≤1 SCHEDULED) and INV-13 (no overlap) — are enforced inside a
 * `Serializable` transaction against freshly-reconciled status; the GiST exclusion + partial-
 * uniques are DB backstops. SCHEDULED→ACTIVE activation is persisted only on the write path
 * (advisor #2/#4): reads derive live and never write. Snapshots (name/price/currency/duration)
 * are captured once at creation and never re-read from the live Plan (INV-14/M-8).
 */

export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export interface CreateMembershipResult extends ActionState {
  membershipId?: string;
}

const PAGE_SIZE = 20;

export interface MembershipRow {
  id: string;
  memberId: string;
  memberName: string;
  planName: string;
  status: MembershipStatus;
  origin: MembershipOrigin;
  startDate: IsoDate;
  /** Original end extended by finalized frozen days (the date status is judged against). */
  effectiveEndDate: IsoDate;
  remainingDays: number;
  isExpiringSoon: boolean;
  /** Snapshot price as exact minor units (BigInt never crosses to the client). */
  priceMinor: string;
  currency: string;
}

export interface TimelineEntry {
  at: Date;
  title: string;
  detail?: string;
}

export interface MembershipDetail extends MembershipRow {
  durationValue: number;
  durationUnit: DurationUnit;
  createdAt: Date;
  scheduledEffectiveFrom: IsoDate | null;
  predecessorMembershipId: string | null;
  /** The member's current responsible trainer (read-only; owned by the members module). */
  trainerName: string | null;
  totalFrozenDays: number;
  timeline: TimelineEntry[];
}

export interface MembershipListResult {
  rows: MembershipRow[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

/** A membership row for a dashboard operational list (expiring / expired). */
export interface OverviewRow {
  membershipId: string;
  memberId: string;
  memberName: string;
  planName: string;
  effectiveEndDate: IsoDate;
  remainingDays: number;
}

/** Derived membership-status counts + the expiring/expired action lists (Epic-6 dashboard). */
export interface MembershipOverview {
  counts: {
    active: number;
    expiringSoon: number;
    expired: number;
    frozen: number;
    scheduled: number;
  };
  expiringSoon: OverviewRow[];
  expired: OverviewRow[];
}

/**
 * A membership in an expiry-relevant state that warrants a staff notification (Epic-7). Neutral to
 * the notifications module (it maps `event` → `NotificationType`). Frozen/scheduled/cancelled and
 * renewed (has-successor) memberships are already excluded.
 */
export interface ExpiryCandidate {
  membershipId: string;
  memberId: string;
  memberName: string;
  planName: string;
  effectiveEndDate: IsoDate;
  remainingDays: number;
  event: ExpiryEvent;
}

/** The minimal member option list for the create form (active members). */
export interface MemberOption {
  id: string;
  name: string;
}

/** The minimal active-plan option list for the create/upgrade forms. */
export interface PlanOption {
  id: string;
  name: string;
  priceMinor: string;
  currency: string;
}

const factsSelect = {
  id: true,
  predecessorMembershipId: true,
  startDate: true,
  originalEndDate: true,
  cachedTotalFrozenDays: true,
  scheduledEffectiveFrom: true,
  activatedAt: true,
  cancelledAt: true,
  cachedStatus: true,
  cachedEffectiveEndDate: true,
  cachedIsExpiringSoon: true,
} satisfies Prisma.MembershipSelect;

type FactsRow = Prisma.MembershipGetPayload<{ select: typeof factsSelect }>;

interface GymContext {
  timeZone: string;
  windowDays: number;
  today: IsoDate;
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listMemberships(
  principal: AuthenticatedPrincipal,
  params: MembershipListParams,
  clock: IClock = systemClock,
): Promise<MembershipListResult> {
  authorize(principal, PERMISSION_KEYS.MEMBERSHIPS_READ);
  const ctx = await gymContext(principal.gymId, clock);

  const where: Prisma.MembershipWhereInput = { gymId: principal.gymId };
  // cached_status is an accelerator for the filter; each returned row's badge is re-derived
  // live (cheap, date-only) so the common ACTIVE→EXPIRED drift shows correctly (Decision A).
  if (params.status !== "ALL") where.cachedStatus = params.status;
  if (params.q) where.member = { fullName: { contains: params.q, mode: "insensitive" } };

  const total = await prisma.membership.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(params.page, totalPages);
  const rows = await prisma.membership.findMany({
    where,
    include: { member: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return {
    rows: rows.map((m) => toRow(m, m.member.fullName, deriveRow(m, ctx))),
    total,
    page,
    totalPages,
    pageSize: PAGE_SIZE,
  };
}

export async function getMembership(
  principal: AuthenticatedPrincipal,
  membershipId: string,
  clock: IClock = systemClock,
): Promise<MembershipDetail> {
  authorize(principal, PERMISSION_KEYS.MEMBERSHIPS_READ);
  const ctx = await gymContext(principal.gymId, clock);

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      member: {
        select: {
          fullName: true,
          trainerAssignments: {
            where: { unassignedAt: null },
            take: 1,
            include: { trainer: { include: { user: { select: { displayName: true } } } } },
          },
        },
      },
      freezes: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!membership) throw new NotFoundError();
  assertSameGym(principal.gymId, membership.gymId);

  // Full live derivation over the member's whole set (a successor needs its predecessor's
  // status) — read-only, never writes (advisor #4).
  const derived = (await deriveForMember(principal.gymId, membership.memberId, ctx)).get(
    membership.id,
  );
  if (!derived) throw new NotFoundError();

  const open = membership.member.trainerAssignments[0] ?? null;
  return {
    ...toRow(membership, membership.member.fullName, derived),
    durationValue: membership.snapshotDurationValue,
    durationUnit: membership.snapshotDurationUnit,
    createdAt: membership.createdAt,
    scheduledEffectiveFrom: membership.scheduledEffectiveFrom
      ? fromDbDate(membership.scheduledEffectiveFrom)
      : null,
    predecessorMembershipId: membership.predecessorMembershipId,
    trainerName: open?.trainer.user.displayName ?? null,
    totalFrozenDays: membership.cachedTotalFrozenDays,
    timeline: buildTimeline(membership),
  };
}

/**
 * Derived membership overview for the dashboard (Epic-6): status counts + the expiring/expired
 * action lists. Status is re-derived per row via the same date-only {@link deriveRow} the list
 * uses (Decision A) — never trusted raw from `cached_status`. Gated by `memberships.read`.
 */
export async function getMembershipOverview(
  principal: AuthenticatedPrincipal,
  clock: IClock = systemClock,
  listLimit = 8,
): Promise<MembershipOverview> {
  authorize(principal, PERMISSION_KEYS.MEMBERSHIPS_READ);
  const ctx = await gymContext(principal.gymId, clock);

  const memberships = await prisma.membership.findMany({
    where: { gymId: principal.gymId },
    include: { member: { select: { fullName: true } } },
  });

  const counts = { active: 0, expiringSoon: 0, expired: 0, frozen: 0, scheduled: 0 };
  const expiring: OverviewRow[] = [];
  const expired: OverviewRow[] = [];

  for (const m of memberships) {
    const d = deriveRow(m, ctx);
    const row: OverviewRow = {
      membershipId: m.id,
      memberId: m.memberId,
      memberName: m.member.fullName,
      planName: m.snapshotPlanName,
      effectiveEndDate: d.effectiveEndDate,
      remainingDays: d.remainingDays,
    };
    switch (d.status) {
      case MembershipStatus.ACTIVE:
        counts.active += 1;
        if (d.isExpiringSoon) {
          counts.expiringSoon += 1;
          expiring.push(row);
        }
        break;
      case MembershipStatus.EXPIRED:
        counts.expired += 1;
        expired.push(row);
        break;
      case MembershipStatus.FROZEN:
        counts.frozen += 1;
        break;
      case MembershipStatus.SCHEDULED:
        counts.scheduled += 1;
        break;
      default:
        break; // CANCELLED is not an operational count
    }
  }

  // Most urgent first for expiring (fewest days left); most recently ended first for expired.
  expiring.sort((a, b) => a.remainingDays - b.remainingDays);
  expired.sort((a, b) => b.effectiveEndDate.localeCompare(a.effectiveEndDate));

  return {
    counts,
    expiringSoon: expiring.slice(0, listLimit),
    expired: expired.slice(0, listLimit),
  };
}

/**
 * The memberships that currently warrant an expiry notification (Epic-7) — Expiring-Soon or Expired,
 * with frozen (FRZ-3), scheduled, cancelled, and renewed (has-successor) periods excluded. Reuses the
 * **full** {@link deriveMemberLifecycle} per member (not the light list derivation) so freeze-extended
 * end dates and SCHEDULED→ACTIVE resolution are correct, then applies the pure {@link pickExpiryEvent}
 * rule. Gated by `memberships.read`; consumed by the notifications generation service through the
 * module's public index. Read-only — never writes (no auto-activation on this path).
 *
 * This read is **unbounded** by time: it returns every expiring/expired tail. The NTF-5 recent-window
 * bound on EXPIRED *alerts* is a notification-generation policy applied by the consumer, so this read
 * stays reusable and dashboards/reports (which need the full expired set) are unaffected.
 */
export async function getExpiryCandidates(
  principal: AuthenticatedPrincipal,
  clock: IClock = systemClock,
): Promise<ExpiryCandidate[]> {
  authorize(principal, PERMISSION_KEYS.MEMBERSHIPS_READ);
  const ctx = await gymContext(principal.gymId, clock);

  const rows = await prisma.membership.findMany({
    where: { gymId: principal.gymId },
    select: {
      ...factsSelect,
      memberId: true,
      snapshotPlanName: true,
      member: { select: { fullName: true } },
    },
  });

  // A membership that is some other period's predecessor has been renewed/upgraded → suppressed.
  const hasSuccessor = new Set(
    rows.map((r) => r.predecessorMembershipId).filter((id): id is string => id !== null),
  );

  const byMember = new Map<string, typeof rows>();
  for (const row of rows) {
    const bucket = byMember.get(row.memberId);
    if (bucket) bucket.push(row);
    else byMember.set(row.memberId, [row]);
  }

  const freezeIds = await loadActiveFreezeIds(
    prisma,
    rows.map((r) => r.id),
  );

  const candidates: ExpiryCandidate[] = [];
  for (const [, group] of byMember) {
    const derived = deriveMemberLifecycle(group.map(toFacts), freezeIds, ctx.today, ctx.windowDays);
    for (const row of group) {
      const d = derived.get(row.id);
      if (!d) continue;
      const event = pickExpiryEvent(d, hasSuccessor.has(row.id));
      if (!event) continue;
      candidates.push({
        membershipId: row.id,
        memberId: row.memberId,
        memberName: row.member.fullName,
        planName: row.snapshotPlanName,
        effectiveEndDate: d.effectiveEndDate,
        remainingDays: d.remainingDays,
        event,
      });
    }
  }
  return candidates;
}

/** Active members eligible to be sold a membership (for the create form). */
export async function listSellableMembers(
  principal: AuthenticatedPrincipal,
): Promise<MemberOption[]> {
  authorize(principal, PERMISSION_KEYS.MEMBERSHIPS_CREATE);
  const members = await prisma.member.findMany({
    where: { gymId: principal.gymId, status: "ACTIVE" },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
  return members.map((m) => ({ id: m.id, name: m.fullName }));
}

/** Active plans sellable on a new membership / upgrade (PLN-2). */
export async function listSellablePlans(principal: AuthenticatedPrincipal): Promise<PlanOption[]> {
  authorize(principal, PERMISSION_KEYS.MEMBERSHIPS_CREATE);
  return querySellablePlans(principal.gymId);
}

// ── Commands ─────────────────────────────────────────────────────────────────

export async function createMembership(
  principal: AuthenticatedPrincipal,
  input: unknown,
  clock: IClock = systemClock,
): Promise<CreateMembershipResult> {
  authorize(principal, PERMISSION_KEYS.MEMBERSHIPS_CREATE);
  const parsed = CreateMembershipSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await gymContext(principal.gymId, clock);

  return prisma.$transaction(
    async (tx) => {
      const member = await loadOwnedMember(tx, principal.gymId, parsed.data.memberId);
      const plan = await loadOwnedPlan(tx, principal.gymId, parsed.data.planId);
      if (!plan.isActive) {
        return error("That plan is retired and can't be sold. Choose an active plan.");
      }

      const derived = await reconcileMember(tx, principal.gymId, member.id, ctx, clock);
      const conflict = blockingForNewSale(derived);
      if (conflict) return error(conflict);

      const start = parsed.data.startDate ?? ctx.today;
      const end = inclusiveEndDate(start, plan.durationValue, plan.durationUnit);
      const created = await tx.membership.create({
        data: {
          gymId: principal.gymId,
          branchId: member.branchId,
          memberId: member.id,
          createdById: principal.userId,
          origin: MembershipOrigin.NEW,
          startDate: toDbDate(start),
          originalEndDate: toDbDate(end),
          activatedAt: clock.now(),
          ...snapshotData(plan),
          ...cacheData(
            MembershipStatus.ACTIVE,
            end,
            0,
            expiringSoon(ctx.today, end, ctx.windowDays),
          ),
        },
        select: { id: true },
      });
      return { status: "success" as const, membershipId: created.id };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function renewMembership(
  principal: AuthenticatedPrincipal,
  membershipId: string,
  clock: IClock = systemClock,
): Promise<CreateMembershipResult> {
  authorize(principal, PERMISSION_KEYS.MEMBERSHIPS_RENEW);
  const ctx = await gymContext(principal.gymId, clock);

  return prisma.$transaction(
    async (tx) => {
      const current = await loadOwnedMembership(tx, principal.gymId, membershipId);
      const derived = await reconcileMember(tx, principal.gymId, current.memberId, ctx, clock);
      const currentStatus = derived.get(current.id)?.status;
      if (currentStatus === MembershipStatus.CANCELLED) {
        return error("A cancelled membership can't be renewed — create a new one instead.");
      }

      // REN-1: the new period starts the later of today or the day after the current end.
      const dayAfterEnd = addDays(effectiveEndOf(derived, current.id), 1);
      const newStart = maxDate(ctx.today, dayAfterEnd);
      const scheduled = isAfter(newStart, ctx.today); // early renewal → queued; after expiry → live now

      const conflict = scheduled
        ? blockingForScheduled(derived, current.id)
        : blockingForActive(derived);
      if (conflict) return error(conflict);

      // REN-3: a fresh snapshot of the (same) plan's CURRENT terms — retired plans still renew.
      const plan = await loadOwnedPlan(tx, principal.gymId, current.sourcePlanId);
      const end = inclusiveEndDate(newStart, plan.durationValue, plan.durationUnit);
      const created = await createSuccessor(tx, principal, current, plan, {
        origin: MembershipOrigin.RENEWAL,
        start: newStart,
        end,
        scheduled,
        ctx,
        clock,
      });
      return { status: "success" as const, membershipId: created };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function upgradeMembership(
  principal: AuthenticatedPrincipal,
  membershipId: string,
  input: unknown,
  clock: IClock = systemClock,
): Promise<CreateMembershipResult> {
  authorize(principal, PERMISSION_KEYS.MEMBERSHIPS_UPGRADE);
  const parsed = UpgradeMembershipSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await gymContext(principal.gymId, clock);

  return prisma.$transaction(
    async (tx) => {
      const current = await loadOwnedMembership(tx, principal.gymId, membershipId);
      const plan = await loadOwnedPlan(tx, principal.gymId, parsed.data.planId);
      if (!plan.isActive) {
        return error("That plan is retired and can't be sold. Choose an active plan.");
      }

      const derived = await reconcileMember(tx, principal.gymId, current.memberId, ctx, clock);
      // UPG-1: only an Active current period can be upgraded (deferred model).
      if (derived.get(current.id)?.status !== MembershipStatus.ACTIVE) {
        return error("Only an active membership can be upgraded.");
      }
      const conflict = blockingForScheduled(derived, current.id);
      if (conflict) return error(conflict);

      // UPG-1/MSH-7: the new plan starts the day after the current period ends.
      const start = addDays(effectiveEndOf(derived, current.id), 1);
      const end = inclusiveEndDate(start, plan.durationValue, plan.durationUnit);
      const origin =
        plan.price >= current.snapshotPrice ? MembershipOrigin.UPGRADE : MembershipOrigin.DOWNGRADE;
      const created = await createSuccessor(tx, principal, current, plan, {
        origin,
        start,
        end,
        scheduled: true,
        ctx,
        clock,
      });
      return { status: "success" as const, membershipId: created };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function freezeMembership(
  principal: AuthenticatedPrincipal,
  membershipId: string,
  input: unknown,
  clock: IClock = systemClock,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.MEMBERSHIPS_FREEZE);
  const parsed = FreezeMembershipSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await gymContext(principal.gymId, clock);

  return prisma.$transaction(
    async (tx) => {
      const membership = await loadOwnedMembership(tx, principal.gymId, membershipId);
      const derived = await reconcileMember(tx, principal.gymId, membership.memberId, ctx, clock);
      // FRZ-4: only an Active membership may be frozen.
      if (derived.get(membership.id)?.status !== MembershipStatus.ACTIVE) {
        return error("Only an active membership can be frozen.");
      }

      const freezeStart = ctx.today;
      await tx.membershipFreeze.create({
        data: {
          gymId: principal.gymId,
          membershipId: membership.id,
          freezeStart: toDbDate(freezeStart),
          plannedEnd: toDbDate(addDays(freezeStart, parsed.data.frozenDays - 1)),
          frozenDays: parsed.data.frozenDays, // planned; finalized to actual on resume (INV-18)
          status: FreezeStatus.ACTIVE,
          createdById: principal.userId,
        },
      });
      await tx.membership.update({
        where: { id: membership.id },
        data: { cachedStatus: MembershipStatus.FROZEN, cachedIsExpiringSoon: false },
      });
      return { status: "success" as const };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function resumeMembership(
  principal: AuthenticatedPrincipal,
  membershipId: string,
  clock: IClock = systemClock,
): Promise<ActionState> {
  // Decision B: resume is gated by `memberships.freeze` (no `memberships.resume` key — INV-7).
  authorize(principal, PERMISSION_KEYS.MEMBERSHIPS_FREEZE);
  const ctx = await gymContext(principal.gymId, clock);

  return prisma.$transaction(
    async (tx) => {
      const membership = await loadOwnedMembership(tx, principal.gymId, membershipId);
      const freeze = await tx.membershipFreeze.findFirst({
        where: { membershipId: membership.id, status: FreezeStatus.ACTIVE },
      });
      if (!freeze) return error("This membership isn't frozen.");

      // FRZ-2/T-4: the clock was stopped [freezeStart, today); end extends by exactly that many days.
      const actualFrozenDays = Math.max(0, dayDiff(fromDbDate(freeze.freezeStart), ctx.today));
      const newTotal = membership.cachedTotalFrozenDays + actualFrozenDays;
      const newEnd = addDays(fromDbDate(membership.originalEndDate), newTotal);
      const status = isAfter(ctx.today, newEnd)
        ? MembershipStatus.EXPIRED
        : MembershipStatus.ACTIVE;

      await tx.membershipFreeze.update({
        where: { id: freeze.id },
        data: {
          status: FreezeStatus.ENDED,
          actualEnd: toDbDate(ctx.today),
          frozenDays: actualFrozenDays,
          endedById: principal.userId,
        },
      });
      await tx.membership.update({
        where: { id: membership.id },
        data: cacheData(status, newEnd, newTotal, expiringSoon(ctx.today, newEnd, ctx.windowDays)),
      });
      return { status: "success" as const };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function cancelMembership(
  principal: AuthenticatedPrincipal,
  membershipId: string,
  clock: IClock = systemClock,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.MEMBERSHIPS_CANCEL);
  const ctx = await gymContext(principal.gymId, clock);

  return prisma.$transaction(
    async (tx) => {
      const membership = await loadOwnedMembership(tx, principal.gymId, membershipId);
      const derived = await reconcileMember(tx, principal.gymId, membership.memberId, ctx, clock);
      const status = derived.get(membership.id)?.status;
      if (status === MembershipStatus.CANCELLED)
        return error("This membership is already cancelled.");
      if (status === MembershipStatus.EXPIRED) {
        return error("An expired membership can't be cancelled — it has already ended.");
      }

      // Close any open freeze so the partial-unique stays clean and history is honest. Cancel
      // grants no end-date benefit (the period ends now); the freeze's actual frozen days are
      // still finalized for an accurate record.
      const openFreeze = await tx.membershipFreeze.findFirst({
        where: { membershipId: membership.id, status: FreezeStatus.ACTIVE },
      });
      if (openFreeze) {
        await tx.membershipFreeze.update({
          where: { id: openFreeze.id },
          data: {
            status: FreezeStatus.ENDED,
            actualEnd: toDbDate(ctx.today),
            frozenDays: Math.max(0, dayDiff(fromDbDate(openFreeze.freezeStart), ctx.today)),
            endedById: principal.userId,
          },
        });
      }
      await tx.membership.update({
        where: { id: membership.id },
        data: {
          cancelledAt: clock.now(),
          cancelledById: principal.userId,
          cachedStatus: MembershipStatus.CANCELLED,
          cachedIsExpiringSoon: false,
        },
      });
      return { status: "success" as const };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

// ── reconcile & derivation glue ───────────────────────────────────────────────

type Tx = Prisma.TransactionClient;

/**
 * Recompute every membership of one member from immutable dates + freeze state, persist any
 * drifted `cached_*`, and **activate** a due SCHEDULED period (predecessor terminal + start
 * reached). Runs inside the caller's `Serializable` tx; returns the derived map so the caller
 * enforces INV-12 against fresh status.
 */
async function reconcileMember(
  tx: Tx,
  gymId: string,
  memberId: string,
  ctx: GymContext,
  clock: IClock,
): Promise<Map<string, DerivedMembership>> {
  const facts = await tx.membership.findMany({ where: { memberId, gymId }, select: factsSelect });
  const freezeIds = await loadActiveFreezeIds(
    tx,
    facts.map((f) => f.id),
  );
  const derived = deriveMemberLifecycle(facts.map(toFacts), freezeIds, ctx.today, ctx.windowDays);

  for (const fact of facts) {
    const d = derived.get(fact.id);
    if (!d) continue;
    const data: Prisma.MembershipUpdateInput = {};
    if (d.isDueForActivation && !fact.activatedAt) data.activatedAt = clock.now();
    if (fact.cachedStatus !== d.status) data.cachedStatus = d.status;
    if (fromDbDate(fact.cachedEffectiveEndDate) !== d.effectiveEndDate) {
      data.cachedEffectiveEndDate = toDbDate(d.effectiveEndDate);
    }
    if (fact.cachedIsExpiringSoon !== d.isExpiringSoon)
      data.cachedIsExpiringSoon = d.isExpiringSoon;
    if (Object.keys(data).length > 0) await tx.membership.update({ where: { id: fact.id }, data });
  }
  return derived;
}

/** Read-only derivation for the detail view (no writes) — loads the member's set + freezes. */
async function deriveForMember(
  gymId: string,
  memberId: string,
  ctx: GymContext,
): Promise<Map<string, DerivedMembership>> {
  const facts = await prisma.membership.findMany({
    where: { memberId, gymId },
    select: factsSelect,
  });
  const freezeIds = await loadActiveFreezeIds(
    prisma,
    facts.map((f) => f.id),
  );
  return deriveMemberLifecycle(facts.map(toFacts), freezeIds, ctx.today, ctx.windowDays);
}

/** The set of membership ids (within `ids`) that currently hold an open freeze (FROZEN). */
async function loadActiveFreezeIds(
  client: Tx | typeof prisma,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const freezes = await client.membershipFreeze.findMany({
    where: { membershipId: { in: ids }, status: FreezeStatus.ACTIVE },
    select: { membershipId: true },
  });
  return new Set(freezes.map((f) => f.membershipId));
}

// ── helpers ────────────────────────────────────────────────────────────────

async function gymContext(gymId: string, clock: IClock): Promise<GymContext> {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { timeZone: true, expiringSoonWindowDays: true },
  });
  if (!gym) throw new NotFoundError();
  return {
    timeZone: gym.timeZone,
    windowDays: gym.expiringSoonWindowDays,
    today: clock.today(gym.timeZone),
  };
}

async function loadOwnedMember(tx: Tx, gymId: string, memberId: string) {
  const member = await tx.member.findUnique({
    where: { id: memberId },
    select: { id: true, gymId: true, branchId: true },
  });
  if (!member) throw new NotFoundError();
  assertSameGym(gymId, member.gymId);
  return member;
}

async function loadOwnedPlan(tx: Tx, gymId: string, planId: string) {
  const plan = await tx.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError();
  assertSameGym(gymId, plan.gymId);
  return plan;
}

async function loadOwnedMembership(tx: Tx, gymId: string, membershipId: string) {
  const membership = await tx.membership.findUnique({ where: { id: membershipId } });
  if (!membership) throw new NotFoundError();
  assertSameGym(gymId, membership.gymId);
  return membership;
}

async function querySellablePlans(gymId: string): Promise<PlanOption[]> {
  const plans = await prisma.plan.findMany({
    where: { gymId, isActive: true },
    select: { id: true, name: true, price: true, currency: true },
    orderBy: { name: "asc" },
  });
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    priceMinor: p.price.toString(),
    currency: p.currency,
  }));
}

interface SuccessorArgs {
  origin: MembershipOrigin;
  start: IsoDate;
  end: IsoDate;
  scheduled: boolean;
  ctx: GymContext;
  clock: IClock;
}

/** Create the next period (renewal/upgrade): a fresh snapshot, predecessor link, append-only. */
async function createSuccessor(
  tx: Tx,
  principal: AuthenticatedPrincipal,
  current: { id: string; memberId: string; branchId: string },
  plan: PlanLike,
  args: SuccessorArgs,
): Promise<string> {
  const status = args.scheduled ? MembershipStatus.SCHEDULED : MembershipStatus.ACTIVE;
  const created = await tx.membership.create({
    data: {
      gymId: principal.gymId,
      branchId: current.branchId,
      memberId: current.memberId,
      createdById: principal.userId,
      origin: args.origin,
      predecessorMembershipId: current.id,
      startDate: toDbDate(args.start),
      originalEndDate: toDbDate(args.end),
      scheduledEffectiveFrom: args.scheduled ? toDbDate(args.start) : null,
      activatedAt: args.scheduled ? null : args.clock.now(),
      ...snapshotData(plan),
      ...cacheData(
        status,
        args.end,
        0,
        status === MembershipStatus.ACTIVE &&
          expiringSoon(args.ctx.today, args.end, args.ctx.windowDays),
      ),
    },
    select: { id: true },
  });
  return created.id;
}

interface PlanLike {
  id: string;
  name: string;
  price: bigint;
  currency: string;
  durationValue: number;
  durationUnit: DurationUnit;
}

function snapshotData(plan: PlanLike) {
  return {
    sourcePlanId: plan.id,
    snapshotPlanName: plan.name,
    snapshotPrice: plan.price,
    snapshotCurrency: plan.currency,
    snapshotDurationValue: plan.durationValue,
    snapshotDurationUnit: plan.durationUnit,
  };
}

function cacheData(
  status: MembershipStatus,
  effectiveEnd: IsoDate,
  totalFrozenDays: number,
  isExpiringSoon: boolean,
) {
  return {
    cachedStatus: status,
    cachedEffectiveEndDate: toDbDate(effectiveEnd),
    cachedTotalFrozenDays: totalFrozenDays,
    cachedIsExpiringSoon: isExpiringSoon,
  };
}

function expiringSoon(today: IsoDate, effectiveEnd: IsoDate, windowDays: number): boolean {
  const remaining = dayDiff(today, effectiveEnd);
  return remaining >= 0 && remaining <= windowDays;
}

function effectiveEndOf(derived: Map<string, DerivedMembership>, id: string): IsoDate {
  const d = derived.get(id);
  if (!d) throw new NotFoundError();
  return d.effectiveEndDate;
}

/** INV-12: a new sale needs the member to have no ACTIVE and no SCHEDULED period. */
function blockingForNewSale(derived: Map<string, DerivedMembership>): string | null {
  return blockingForActive(derived) ?? blockingForScheduled(derived, null);
}

function blockingForActive(derived: Map<string, DerivedMembership>): string | null {
  for (const d of derived.values()) {
    if (d.status === MembershipStatus.ACTIVE || d.status === MembershipStatus.FROZEN) {
      return "This member already has an active membership. Renew, upgrade, or cancel it first.";
    }
  }
  return null;
}

function blockingForScheduled(
  derived: Map<string, DerivedMembership>,
  exceptId: string | null,
): string | null {
  for (const [id, d] of derived.entries()) {
    if (id === exceptId) continue;
    if (d.status === MembershipStatus.SCHEDULED) {
      return "This member already has a scheduled next period. Cancel it before adding another.";
    }
  }
  return null;
}

function toFacts(row: FactsRow): MembershipFacts {
  return {
    id: row.id,
    predecessorMembershipId: row.predecessorMembershipId,
    startDate: fromDbDate(row.startDate),
    originalEndDate: fromDbDate(row.originalEndDate),
    cachedTotalFrozenDays: row.cachedTotalFrozenDays,
    scheduledEffectiveFrom: row.scheduledEffectiveFrom
      ? fromDbDate(row.scheduledEffectiveFrom)
      : null,
    activatedAt: row.activatedAt,
    cancelledAt: row.cancelledAt,
  };
}

/** Light, date-only derivation for a list row (no predecessor resolution — Decision A). */
function deriveRow(m: ListRowRecord, ctx: GymContext): DerivedMembership {
  const effectiveEnd = addDays(fromDbDate(m.originalEndDate), m.cachedTotalFrozenDays);
  const remainingDays = dayDiff(ctx.today, effectiveEnd);
  let status: MembershipStatus;
  if (m.cancelledAt) status = MembershipStatus.CANCELLED;
  else if (m.cachedStatus === MembershipStatus.FROZEN) status = MembershipStatus.FROZEN;
  else if (m.cachedStatus === MembershipStatus.SCHEDULED) status = MembershipStatus.SCHEDULED;
  else
    status = isAfter(ctx.today, effectiveEnd) ? MembershipStatus.EXPIRED : MembershipStatus.ACTIVE;
  const isExpiringSoon =
    status === MembershipStatus.ACTIVE && remainingDays >= 0 && remainingDays <= ctx.windowDays;
  return {
    status,
    effectiveEndDate: effectiveEnd,
    remainingDays,
    isExpiringSoon,
    isDueForActivation: false,
  };
}

interface ListRowRecord {
  id: string;
  memberId: string;
  origin: MembershipOrigin;
  startDate: Date;
  originalEndDate: Date;
  cachedTotalFrozenDays: number;
  cachedStatus: MembershipStatus;
  cancelledAt: Date | null;
  snapshotPlanName: string;
  snapshotPrice: bigint;
  snapshotCurrency: string;
}

function toRow(m: ListRowRecord, memberName: string, derived: DerivedMembership): MembershipRow {
  return {
    id: m.id,
    memberId: m.memberId,
    memberName,
    planName: m.snapshotPlanName,
    status: derived.status,
    origin: m.origin,
    startDate: fromDbDate(m.startDate),
    effectiveEndDate: derived.effectiveEndDate,
    remainingDays: derived.remainingDays,
    isExpiringSoon: derived.isExpiringSoon,
    priceMinor: m.snapshotPrice.toString(),
    currency: m.snapshotCurrency,
  };
}

interface TimelineSource {
  origin: MembershipOrigin;
  createdAt: Date;
  activatedAt: Date | null;
  scheduledEffectiveFrom: Date | null;
  cancelledAt: Date | null;
  snapshotPlanName: string;
  freezes: {
    freezeStart: Date;
    actualEnd: Date | null;
    frozenDays: number;
    status: FreezeStatus;
  }[];
}

/** Compose the read-only lifecycle timeline from immutable records (Decision C; H-1/H-5). */
function buildTimeline(m: TimelineSource): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  entries.push({ at: m.createdAt, title: createdTitle(m.origin), detail: m.snapshotPlanName });
  if (m.activatedAt && m.scheduledEffectiveFrom) {
    entries.push({ at: m.activatedAt, title: "Activated", detail: "Became the live period" });
  }
  for (const f of m.freezes) {
    entries.push({ at: f.freezeStart, title: "Frozen" });
    if (f.actualEnd) {
      entries.push({
        at: f.actualEnd,
        title: "Resumed",
        detail: `Frozen ${f.frozenDays} day${f.frozenDays === 1 ? "" : "s"}; end date extended`,
      });
    }
  }
  if (m.cancelledAt) entries.push({ at: m.cancelledAt, title: "Cancelled" });
  return entries.sort((a, b) => a.at.getTime() - b.at.getTime());
}

function createdTitle(origin: MembershipOrigin): string {
  switch (origin) {
    case MembershipOrigin.RENEWAL:
      return "Renewed";
    case MembershipOrigin.UPGRADE:
      return "Upgraded";
    case MembershipOrigin.DOWNGRADE:
      return "Downgraded";
    default:
      return "Membership created";
  }
}

function error(message: string): ActionState {
  return { status: "error", message };
}

function invalid(err: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): ActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors: err.flatten().fieldErrors,
  };
}
