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
import { sumRevenueInRange, type DatedLedgerEntry } from "./revenue";
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
  const memberships = await prisma.membership.findMany({
    where: {
      gymId: principal.gymId,
      cancelledAt: null,
      cachedStatus: { not: MembershipStatus.SCHEDULED },
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

  const outstanding = memberships
    .map((m) => {
      const ledger: LedgerEntry[] = m.payments.map((p) => ({
        entryType: p.entryType,
        amountMinor: p.amount,
      }));
      return { membership: m, remaining: summarizeLedger(m.snapshotPrice, ledger).remainingMinor };
    })
    .filter((x) => x.remaining > 0n)
    .sort((a, b) => (a.remaining < b.remaining ? 1 : a.remaining > b.remaining ? -1 : 0));

  return {
    count: outstanding.length,
    rows: outstanding.slice(0, limit).map(({ membership: m, remaining }) => ({
      membershipId: m.id,
      memberId: m.memberId,
      memberName: m.member.fullName,
      planName: m.snapshotPlanName,
      remainingMinor: remaining.toString(),
      currency: m.snapshotCurrency,
    })),
  };
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
