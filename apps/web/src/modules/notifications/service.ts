import { prisma, Prisma, NotificationState, type NotificationType } from "@pulse/db";
import { PERMISSION_KEYS } from "@pulse/auth";
import type { AuthenticatedPrincipal, IClock } from "@pulse/types";
import { authorize } from "@/lib/auth/assert";
import { assertSameGym } from "@/lib/tenancy";
import { NotFoundError } from "@/lib/errors";
import { systemClock } from "@/lib/platform/clock";
import { getExpiryCandidates } from "@/modules/memberships";
import { buildNotificationInput, canTransition } from "./generation";

/**
 * Notifications domain service (Sprint-1 Epic-7) — the testable core of the mutation pipeline:
 * **authorize (by permission) → scope (gymId) → execute**. Every function takes an explicit
 * `principal`; timestamps come from an injectable {@link IClock} (T-26/27 — never `new Date()`).
 *
 * Generation is a **replaceable** service (`generateExpiryNotifications`): its only trigger in the
 * MVP is a Server Action fired when the notifications page opens, but the business logic is trigger-
 * agnostic (a cron/worker/queue could call it unchanged). It reuses the membership lifecycle
 * (`getExpiryCandidates`, composed through the module's public index) — status is never re-derived
 * here — and writes append-only with `skipDuplicates`, so re-running is a no-op (NTF-3/INV-33/34).
 *
 * Read/generate are gated by `notifications.read`; state transitions by `notifications.manage`.
 * Notifications are **gym-scoped only** (NTF-4) — the `Notification` table has no `branch_id`.
 */

export interface ActionState {
  status: "success" | "error";
  message?: string;
}

export interface GenerateResult {
  created: number;
}

export type NotificationFilter = "all" | "unread";

/** A notification prepared for the staff queue (Dismissed rows are never listed — they leave it). */
export interface NotificationView {
  id: string;
  type: NotificationType;
  state: NotificationState;
  message: string;
  memberName: string;
  planName: string;
  membershipId: string;
  generatedAt: Date;
}

// ── Generation (the replaceable NotificationGenerationService) ─────────────────

/**
 * Materialize Expiring-Soon / Expired notifications for the gym from the current membership
 * lifecycle (NTF-2). Idempotent: the unique `(gymId, dedupeKey)` + `skipDuplicates` means an already-
 * raised event — even one later read or dismissed — is not recreated (NTF-3/INV-33/INV-34).
 */
export async function generateExpiryNotifications(
  principal: AuthenticatedPrincipal,
  clock: IClock = systemClock,
): Promise<GenerateResult> {
  authorize(principal, PERMISSION_KEYS.NOTIFICATIONS_READ);
  const candidates = await getExpiryCandidates(principal, clock);
  if (candidates.length === 0) return { created: 0 };

  const data = candidates.map((c) => buildNotificationInput(c, principal.gymId));
  const result = await prisma.notification.createMany({ data, skipDuplicates: true });
  return { created: result.count };
}

// ── Reads ──────────────────────────────────────────────────────────────────

export async function listNotifications(
  principal: AuthenticatedPrincipal,
  filter: NotificationFilter,
): Promise<NotificationView[]> {
  authorize(principal, PERMISSION_KEYS.NOTIFICATIONS_READ);

  const where: Prisma.NotificationWhereInput = { gymId: principal.gymId };
  // The active queue excludes Dismissed (they have left it — NTF-4); "unread" narrows further.
  where.state =
    filter === "unread" ? NotificationState.UNREAD : { not: NotificationState.DISMISSED };

  const rows = await prisma.notification.findMany({
    where,
    include: {
      member: { select: { fullName: true } },
      membership: { select: { snapshotPlanName: true } },
    },
    // Enum order is UNREAD, READ, DISMISSED, so `state asc` surfaces unread first; newest within.
    orderBy: [{ state: "asc" }, { generatedAt: "desc" }],
  });

  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    state: n.state,
    message: n.message,
    memberName: n.member.fullName,
    planName: n.membership.snapshotPlanName,
    membershipId: n.membershipId,
    generatedAt: n.generatedAt,
  }));
}

export async function getUnreadCount(principal: AuthenticatedPrincipal): Promise<number> {
  authorize(principal, PERMISSION_KEYS.NOTIFICATIONS_READ);
  return prisma.notification.count({
    where: { gymId: principal.gymId, state: NotificationState.UNREAD },
  });
}

// ── State transitions (Unread → Read → Dismissed) ─────────────────────────────

export async function markNotificationRead(
  principal: AuthenticatedPrincipal,
  notificationId: string,
  clock: IClock = systemClock,
): Promise<ActionState> {
  return setState(principal, notificationId, NotificationState.READ, clock);
}

export async function dismissNotification(
  principal: AuthenticatedPrincipal,
  notificationId: string,
  clock: IClock = systemClock,
): Promise<ActionState> {
  return setState(principal, notificationId, NotificationState.DISMISSED, clock);
}

/** Mark every unread notification in the gym as read (NotificationCenter "mark all read"). */
export async function markAllRead(
  principal: AuthenticatedPrincipal,
  clock: IClock = systemClock,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.NOTIFICATIONS_MANAGE);
  await prisma.notification.updateMany({
    where: { gymId: principal.gymId, state: NotificationState.UNREAD },
    data: { state: NotificationState.READ, readAt: clock.now(), readById: principal.userId },
  });
  return { status: "success" };
}

/**
 * Move one owned notification to `to`, enforcing the legal progression (`canTransition`) and tenant
 * isolation (`assertSameGym` → 404). A transition to the current state is an idempotent success; an
 * illegal one (e.g. Dismissed → Read) is refused, never written.
 */
async function setState(
  principal: AuthenticatedPrincipal,
  notificationId: string,
  to: NotificationState,
  clock: IClock,
): Promise<ActionState> {
  authorize(principal, PERMISSION_KEYS.NOTIFICATIONS_MANAGE);
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, gymId: true, state: true },
  });
  if (!notification) throw new NotFoundError();
  assertSameGym(principal.gymId, notification.gymId);

  if (notification.state === to) return { status: "success" };
  if (!canTransition(notification.state, to)) {
    return { status: "error", message: "This notification can no longer be updated." };
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: stampFor(to, principal, clock),
  });
  return { status: "success" };
}

function stampFor(
  to: NotificationState,
  principal: AuthenticatedPrincipal,
  clock: IClock,
): Prisma.NotificationUpdateInput {
  return to === NotificationState.READ
    ? { state: to, readAt: clock.now(), readBy: { connect: { id: principal.userId } } }
    : { state: to, dismissedAt: clock.now(), dismissedBy: { connect: { id: principal.userId } } };
}
