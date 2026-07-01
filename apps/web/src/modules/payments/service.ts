import {
  prisma,
  Prisma,
  PaymentEntryType,
  MembershipStatus,
  type PaymentMethod,
  type PaymentStanding,
} from "@pulse/db";
import { PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { authorize } from "@/lib/auth/assert";
import { assertSameGym } from "@/lib/tenancy";
import { NotFoundError } from "@/lib/errors";
import { systemClock } from "@/lib/platform/clock";
import { parseAmountToMinor } from "@/lib/money";
import { summarizeLedger, type LedgerEntry } from "./ledger";
import { startOfIsoWeek, sumRevenueInRange, type DatedLedgerEntry } from "./revenue";
import { RecordPaymentSchema, VoidPaymentSchema } from "./validation";

/**
 * Payments domain service (Sprint-1 Epic-5) — the testable core of the mutation pipeline:
 * **authorize (by permission) → validate (Zod) → scope (gymId / assertSameGym) → execute →
 * (revalidate in the action)**. Every function takes an explicit `principal` and an injectable
 * `IClock` (T-26/27 — never `new Date()` here).
 *
 * The Payment table is an **append-only ledger** (DDS §2.15/INV-21): a payment is never edited or
 * deleted; a correction is a new VOID entry referencing the original. Outstanding Balance, Total
 * Paid and Payment Standing are **derived** here from the immutable rows ({@link ./ledger}), never
 * stored. Money is exact integer minor units (`bigint`); `lib/money` is the single parse authority.
 * Payments belong to a **Membership** (PAY-6/INV-20), never directly to a Member. Payment activity
 * is **independent of Membership Status** — recording is allowed in any status, and standing never
 * mutates the membership.
 */

export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export interface PaymentHistoryEntry {
  id: string;
  entryType: PaymentEntryType;
  /** Positive magnitude in minor units (string — BigInt never crosses to the client). */
  amountMinor: string;
  /** Cumulative signed total after this entry, in ledger (append) order — minor units string. */
  runningTotalMinor: string;
  currency: string;
  method: PaymentMethod;
  receivedAt: Date;
  recordedByName: string;
  note: string | null;
  voidReason: string | null;
  /** A PAYMENT that has since been voided (renders struck/marked). */
  isVoided: boolean;
  /** True for a PAYMENT that may still be voided (caller also checks the `payments.void` permission). */
  isVoidable: boolean;
}

export interface MembershipBilling {
  membershipId: string;
  currency: string;
  priceMinor: string;
  totalPaidMinor: string;
  /** `price − totalPaid`; negative when overpaid (informational). */
  remainingMinor: string;
  standing: PaymentStanding;
  /** Chronological ledger (oldest first) with a running total. */
  history: PaymentHistoryEntry[];
}

export interface RevenueSummary {
  currency: string;
  /** Net revenue recognised today (gym tz), minor units string. */
  todayMinor: string;
  /** Net revenue recognised this month-to-date (gym tz), minor units string. */
  monthMinor: string;
}

export interface OutstandingBalanceRow {
  membershipId: string;
  memberId: string;
  memberName: string;
  planName: string;
  /** `snapshotPrice − totalPaid`, always `> 0` here (minor units string). */
  remainingMinor: string;
  currency: string;
}

export interface OutstandingBalances {
  rows: OutstandingBalanceRow[];
  /** Total count of memberships with a remaining balance (rows may be truncated). */
  count: number;
}

/** Net revenue for the standard period-to-date buckets + an optional custom range (Epic-8 report). */
export interface RevenueReport {
  currency: string;
  todayMinor: string;
  /** Week-to-date (Monday-start ISO week through today, gym tz). */
  weekMinor: string;
  /** Month-to-date (1st through today, gym tz). */
  monthMinor: string;
  custom: { fromIso: string; toIso: string; totalMinor: string } | null;
}

/** One membership's balance breakdown for the outstanding report (Member / price / paid / balance). */
export interface OutstandingReportRow {
  membershipId: string;
  memberId: string;
  memberName: string;
  planName: string;
  priceMinor: string;
  paidMinor: string;
  remainingMinor: string;
  currency: string;
}

export interface OutstandingReport {
  rows: OutstandingReportRow[];
  count: number;
  /** Sum of remaining balances (minor units). Single-currency in MVP (plan currency = gym default). */
  totalOutstandingMinor: string;
  currency: string;
}

/** The full derived balance for one outstanding membership (bigint minor units, before serialising). */
interface OutstandingRow {
  membershipId: string;
  memberId: string;
  memberName: string;
  planName: string;
  priceMinor: bigint;
  paidMinor: bigint;
  remainingMinor: bigint;
  currency: string;
}

type Tx = Prisma.TransactionClient;

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * The full billing view for a membership: derived totals + standing + the chronological ledger
 * with running totals. Gated by `payments.read`; a cross-gym/unknown membership surfaces as 404.
 */
export async function getMembershipBilling(
  principal: AuthenticatedPrincipal,
  membershipId: string,
): Promise<MembershipBilling> {
  authorize(principal, PERMISSION_KEYS.PAYMENTS_READ);
  const membership = await loadOwnedMembership(prisma, principal.gymId, membershipId);

  const payments = await prisma.payment.findMany({
    where: { gymId: principal.gymId, membershipId },
    orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
    include: {
      recordedBy: { select: { displayName: true } },
      voidedBy: { select: { id: true } },
    },
  });

  const ledger: LedgerEntry[] = payments.map((p) => ({
    entryType: p.entryType,
    amountMinor: p.amount,
  }));
  const summary = summarizeLedger(membership.snapshotPrice, ledger);

  let running = 0n;
  const history: PaymentHistoryEntry[] = payments.map((p) => {
    running += p.entryType === PaymentEntryType.PAYMENT ? p.amount : -p.amount;
    const isVoided = p.entryType === PaymentEntryType.PAYMENT && p.voidedBy !== null;
    return {
      id: p.id,
      entryType: p.entryType,
      amountMinor: p.amount.toString(),
      runningTotalMinor: running.toString(),
      currency: p.currency,
      method: p.method,
      receivedAt: p.receivedAt,
      recordedByName: p.recordedBy.displayName,
      note: p.note,
      voidReason: p.voidReason,
      isVoided,
      isVoidable: p.entryType === PaymentEntryType.PAYMENT && !isVoided,
    };
  });

  return {
    membershipId,
    currency: membership.snapshotCurrency,
    priceMinor: summary.priceMinor.toString(),
    totalPaidMinor: summary.totalPaidMinor.toString(),
    remainingMinor: summary.remainingMinor.toString(),
    standing: summary.standing,
    history,
  };
}

/**
 * Net revenue for the dashboard (Epic-6) — Today + Month-to-date, judged in the **gym time zone**
 * and derived from the immutable ledger (`Σ(PAYMENT) − Σ(VOID)` via the shared sign authority).
 * Never stored. Gated by `payments.read`.
 */
export async function getRevenueSummary(
  principal: AuthenticatedPrincipal,
  clock: IClock = systemClock,
): Promise<RevenueSummary> {
  authorize(principal, PERMISSION_KEYS.PAYMENTS_READ);
  const gym = await prisma.gym.findUnique({
    where: { id: principal.gymId },
    select: { timeZone: true, defaultCurrency: true },
  });
  if (!gym) throw new NotFoundError();

  const today = clock.today(gym.timeZone);
  const monthStart = `${today.slice(0, 7)}-01`;
  const payments = await prisma.payment.findMany({
    where: { gymId: principal.gymId, receivedAt: { gte: new Date(`${monthStart}T00:00:00.000Z`) } },
    select: { entryType: true, amount: true, receivedAt: true },
  });
  const entries: DatedLedgerEntry[] = payments.map((p) => ({
    entryType: p.entryType,
    amountMinor: p.amount,
    receivedOn: p.receivedAt.toISOString().slice(0, 10),
  }));

  return {
    currency: gym.defaultCurrency,
    todayMinor: sumRevenueInRange(entries, today, today).toString(),
    monthMinor: sumRevenueInRange(entries, monthStart, today).toString(),
  };
}

/**
 * Memberships with an outstanding balance (Epic-6) — `snapshotPrice − totalPaid > 0`, derived per
 * membership via {@link summarizeLedger} (never stored). Excluded: **CANCELLED** (immutable
 * `cancelledAt`; the balance is written off) and **SCHEDULED** (a not-yet-started future period —
 * an upgrade/early-renewal successor whose payment isn't today's concern), filtered via the
 * `cached_status` accelerator so an activated (now ACTIVE) renewal with a balance still shows.
 * EXPIRED / FROZEN / ACTIVE with a balance are included (collection). Sorted by largest remaining
 * first, truncated to `limit`. Gated by `payments.read`.
 */
export async function getOutstandingBalances(
  principal: AuthenticatedPrincipal,
  limit = 8,
): Promise<OutstandingBalances> {
  authorize(principal, PERMISSION_KEYS.PAYMENTS_READ);
  const rows = await loadOutstandingRows(principal.gymId);
  return {
    count: rows.length,
    rows: rows.slice(0, limit).map((r) => ({
      membershipId: r.membershipId,
      memberId: r.memberId,
      memberName: r.memberName,
      planName: r.planName,
      remainingMinor: r.remainingMinor.toString(),
      currency: r.currency,
    })),
  };
}

/** A member's net outstanding balance across their non-cancelled, non-scheduled memberships. */
export interface MemberOutstandingBalance {
  hasOutstanding: boolean;
  /** Net remaining in minor units (string — bigint never crosses a module boundary as-is). */
  totalMinor: string;
}

/**
 * The member's outstanding balance total — the **same** "outstanding" definition and exclusions as
 * the dashboard + report (cancelled written-off + not-yet-started SCHEDULED excluded), reusing the
 * shared {@link loadOutstandingRows} + `summarizeLedger` (the single balance calculation, never
 * duplicated) scoped to one member. Gated by `payments.read`. Composed by the Member archive policy
 * (ARC-3 / INV-11) through the module's public index.
 */
export async function getMemberOutstandingBalance(
  principal: AuthenticatedPrincipal,
  memberId: string,
): Promise<MemberOutstandingBalance> {
  authorize(principal, PERMISSION_KEYS.PAYMENTS_READ);
  const rows = await loadOutstandingRows(principal.gymId, memberId);
  const total = rows.reduce((sum, r) => sum + r.remainingMinor, 0n);
  return { hasOutstanding: total > 0n, totalMinor: total.toString() };
}

/**
 * The full Outstanding Balance report (Epic-8): **every** membership with a balance due, each with
 * price / paid / remaining. Reuses the exact same derivation and exclusions as
 * {@link getOutstandingBalances} (cancelled written-off + not-yet-started SCHEDULED excluded;
 * ACTIVE/FROZEN/EXPIRED with a balance included) via the shared {@link loadOutstandingRows} — the
 * balance is the single `summarizeLedger` calculation, never duplicated. Gated by `payments.read`.
 */
export async function getOutstandingBalanceReport(
  principal: AuthenticatedPrincipal,
): Promise<OutstandingReport> {
  authorize(principal, PERMISSION_KEYS.PAYMENTS_READ);
  const rows = await loadOutstandingRows(principal.gymId);
  const gym = await prisma.gym.findUnique({
    where: { id: principal.gymId },
    select: { defaultCurrency: true },
  });
  if (!gym) throw new NotFoundError();

  const total = rows.reduce((sum, r) => sum + r.remainingMinor, 0n);
  return {
    count: rows.length,
    totalOutstandingMinor: total.toString(),
    currency: gym.defaultCurrency,
    rows: rows.map((r) => ({
      membershipId: r.membershipId,
      memberId: r.memberId,
      memberName: r.memberName,
      planName: r.planName,
      priceMinor: r.priceMinor.toString(),
      paidMinor: r.paidMinor.toString(),
      remainingMinor: r.remainingMinor.toString(),
      currency: r.currency,
    })),
  };
}

/**
 * The Revenue report (Epic-8): net revenue Today / Week-to-date / Month-to-date, plus an optional
 * custom range — all derived from the immutable ledger via the shared {@link sumRevenueInRange}
 * (Σ(PAYMENT) − Σ(VOID)), judged in the **gym time zone**, never stored. The standard buckets share
 * one load from the earliest of week/month start; a custom range (arbitrary `from`) is loaded
 * separately so it never bloats the standard query. Gated by `payments.read`.
 */
export async function getRevenueReport(
  principal: AuthenticatedPrincipal,
  custom: { fromIso: string; toIso: string } | null = null,
  clock: IClock = systemClock,
): Promise<RevenueReport> {
  authorize(principal, PERMISSION_KEYS.PAYMENTS_READ);
  const gym = await prisma.gym.findUnique({
    where: { id: principal.gymId },
    select: { timeZone: true, defaultCurrency: true },
  });
  if (!gym) throw new NotFoundError();

  const today = clock.today(gym.timeZone);
  const weekStart = startOfIsoWeek(today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const standardStart = weekStart < monthStart ? weekStart : monthStart;

  const standard = await loadDatedEntries(principal.gymId, standardStart);
  const report: RevenueReport = {
    currency: gym.defaultCurrency,
    todayMinor: sumRevenueInRange(standard, today, today).toString(),
    weekMinor: sumRevenueInRange(standard, weekStart, today).toString(),
    monthMinor: sumRevenueInRange(standard, monthStart, today).toString(),
    custom: null,
  };

  if (custom) {
    const entries = await loadDatedEntries(principal.gymId, custom.fromIso, custom.toIso);
    report.custom = {
      fromIso: custom.fromIso,
      toIso: custom.toIso,
      totalMinor: sumRevenueInRange(entries, custom.fromIso, custom.toIso).toString(),
    };
  }
  return report;
}

/**
 * Load the gym's memberships that carry an outstanding balance, fully derived (price/paid/remaining)
 * and sorted largest-remaining first. The single home for the "outstanding" definition + calculation
 * shared by the dashboard widget and the report.
 */
async function loadOutstandingRows(gymId: string, memberId?: string): Promise<OutstandingRow[]> {
  const memberships = await prisma.membership.findMany({
    where: {
      gymId,
      cancelledAt: null,
      cachedStatus: { not: MembershipStatus.SCHEDULED },
      ...(memberId ? { memberId } : {}),
    },
    select: {
      id: true,
      memberId: true,
      snapshotPrice: true,
      snapshotCurrency: true,
      snapshotPlanName: true,
      member: { select: { fullName: true } },
      payments: { select: { entryType: true, amount: true } },
    },
  });

  return memberships
    .map((m) => {
      const ledger: LedgerEntry[] = m.payments.map((p) => ({
        entryType: p.entryType,
        amountMinor: p.amount,
      }));
      const s = summarizeLedger(m.snapshotPrice, ledger);
      return {
        membershipId: m.id,
        memberId: m.memberId,
        memberName: m.member.fullName,
        planName: m.snapshotPlanName,
        priceMinor: s.priceMinor,
        paidMinor: s.totalPaidMinor,
        remainingMinor: s.remainingMinor,
        currency: m.snapshotCurrency,
      };
    })
    .filter((r) => r.remainingMinor > 0n)
    .sort((a, b) =>
      a.remainingMinor < b.remainingMinor ? 1 : a.remainingMinor > b.remainingMinor ? -1 : 0,
    );
}

/** Load payments (as dated ledger entries) with `receivedAt` from `fromIso` day (optionally to `toIso`). */
async function loadDatedEntries(
  gymId: string,
  fromIso: string,
  toIso?: string,
): Promise<DatedLedgerEntry[]> {
  const receivedAt: Prisma.DateTimeFilter = { gte: new Date(`${fromIso}T00:00:00.000Z`) };
  if (toIso) receivedAt.lte = new Date(`${toIso}T23:59:59.999Z`);
  const payments = await prisma.payment.findMany({
    where: { gymId, receivedAt },
    select: { entryType: true, amount: true, receivedAt: true },
  });
  return payments.map((p) => ({
    entryType: p.entryType,
    amountMinor: p.amount,
    receivedOn: p.receivedAt.toISOString().slice(0, 10),
  }));
}

// ── Commands ─────────────────────────────────────────────────────────────────

/**
 * Record a payment against a membership (PAY-1). Currency + branch are **inherited from the
 * membership snapshot** (never input). The amount is parsed to exact minor units and must be
 * `> 0` (an explicit guard before the DB `CHECK (amount > 0)`). Append-only: a new PAYMENT row.
 */
export async function recordPayment(
  principal: AuthenticatedPrincipal,
  membershipId: string,
  input: unknown,
  clock: IClock = systemClock,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.PAYMENTS_RECORD);
  const parsed = RecordPaymentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const membership = await loadOwnedMembership(prisma, principal.gymId, membershipId);
  const currency = membership.snapshotCurrency;

  const amountMinor = parseAmount(parsed.data.amount, currency);
  if (amountMinor === null || amountMinor <= 0n) return amountError(currency);

  const receivedAt = await resolveReceivedAt(principal.gymId, parsed.data.receivedOn, clock);

  await prisma.payment.create({
    data: {
      gymId: principal.gymId,
      branchId: membership.branchId,
      membershipId: membership.id,
      entryType: PaymentEntryType.PAYMENT,
      amount: amountMinor,
      currency,
      method: parsed.data.method,
      receivedAt,
      recordedById: principal.userId,
      note: parsed.data.note,
    },
  });
  return { status: "success" };
}

/**
 * Void a payment (PAY correction). Never edits/deletes — appends a VOID entry referencing the
 * original, with the same magnitude + currency. Guards: the target must be a PAYMENT (never a
 * VOID), same-gym, and not already voided; the `@@unique([voidsPaymentId])` constraint is the
 * backstop for a concurrent double-void (P2002 → friendly message).
 */
export async function voidPayment(
  principal: AuthenticatedPrincipal,
  paymentId: string,
  input: unknown,
  clock: IClock = systemClock,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.PAYMENTS_VOID);
  const parsed = VoidPaymentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const target = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { voidedBy: { select: { id: true } } },
  });
  if (!target) throw new NotFoundError();
  assertSameGym(principal.gymId, target.gymId);

  if (target.entryType !== PaymentEntryType.PAYMENT) {
    return error("Only a payment can be voided.");
  }
  if (target.voidedBy !== null) return error("This payment has already been voided.");

  try {
    await prisma.payment.create({
      data: {
        gymId: target.gymId,
        branchId: target.branchId,
        membershipId: target.membershipId,
        entryType: PaymentEntryType.VOID,
        amount: target.amount, // same magnitude — nets the payment to zero
        currency: target.currency, // inherited from the voided payment
        method: target.method,
        receivedAt: clock.now(),
        recordedById: principal.userId,
        voidsPaymentId: target.id,
        voidReason: parsed.data.voidReason,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return error("This payment has already been voided.");
    }
    throw e;
  }
  return { status: "success" };
}

// ── helpers ────────────────────────────────────────────────────────────────

async function loadOwnedMembership(
  client: Tx | typeof prisma,
  gymId: string,
  membershipId: string,
) {
  const membership = await client.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, gymId: true, branchId: true, snapshotPrice: true, snapshotCurrency: true },
  });
  if (!membership) throw new NotFoundError();
  assertSameGym(gymId, membership.gymId);
  return membership;
}

/** Parse the major-unit amount to exact minor units; null = over-precise/invalid for the currency. */
function parseAmount(amount: string, currency: string): bigint | null {
  try {
    return parseAmountToMinor(amount, currency);
  } catch {
    return null;
  }
}

/**
 * The revenue-period basis instant. A payment date is a gym-tz calendar day (default = today in the
 * gym tz); we store it at **noon UTC** of that day so it never renders as a neighbouring day under
 * any reasonable tz. The true record instant is captured separately by `recordedAt` (default now).
 */
async function resolveReceivedAt(
  gymId: string,
  receivedOn: string | null,
  clock: IClock,
): Promise<Date> {
  const day = receivedOn ?? clock.today(await gymTimeZone(gymId));
  return new Date(`${day}T12:00:00.000Z`);
}

async function gymTimeZone(gymId: string): Promise<string> {
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { timeZone: true } });
  if (!gym) throw new NotFoundError();
  return gym.timeZone;
}

function amountError(currency: string): ActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors: {
      amount: [
        `Enter a valid ${currency} amount greater than zero, with the right number of decimals.`,
      ],
    },
  };
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
