import { prisma } from "@pulse/db";
import { derivePermissions, isEmailIdentifier, normalizePhone } from "@pulse/auth";
import { verifyPassword } from "@pulse/auth/password";
import type { AuthenticatedPrincipal, Credentials } from "@pulse/types";
import { log } from "@/lib/logger";
import { systemClock } from "@/lib/platform/clock";

/**
 * Resolve verified credentials into a domain-shaped {@link AuthenticatedPrincipal}
 * (T-19). The single source of credential truth used by the Auth.js Credentials
 * `authorize` callback (and the adapter). Returns `null` for **any** failure —
 * unknown user, inactive user, wrong password, or no active gym membership — with
 * no hint as to which (anti-enumeration; security-guidelines.md).
 *
 * Hardening (advisor-reviewed):
 *  - **Constant-ish timing:** on unknown/inactive user we still run a scrypt verify
 *    against a non-loginable sentinel, so timing never reveals account existence.
 *  - **`isActive` gate:** inactive users (incl. the reserved `system-actor`) are
 *    rejected regardless of hash.
 *  - **Sentinel/malformed hashes** verify to `false` (never throw) via the shared
 *    `verifyPassword`.
 *  - No tenant context (no active `GymUser`) → reject; we never establish a session
 *    without a gym scope.
 *  - **Phone ambiguity fails closed:** `User.phone` carries no unique constraint, so
 *    anything but exactly one phone match is rejected — we never pick a winner.
 */
/**
 * Locate the `User` for a sign-in identifier (Pilot Readiness: one field, phone OR
 * email). Contains `@` → the global `email` unique. Otherwise it must normalize to a
 * canonical phone (Arabic-Indic digits and separators tolerated) and match **exactly
 * one** user — `User.phone` has no unique constraint, so 0 or 2+ matches return
 * `null` (fail closed; the generic rejection keeps anti-enumeration intact).
 */
async function findUserByIdentifier(identifier: string) {
  if (isEmailIdentifier(identifier)) {
    return prisma.user.findUnique({ where: { email: identifier } });
  }

  const phone = normalizePhone(identifier);
  if (!phone) return null;

  const matches = await prisma.user.findMany({ where: { phone }, take: 2 });
  if (matches.length > 1) {
    // Ids only — never the phone itself (T-16: no credentials/PII in logs).
    log.warn("auth.login.ambiguous_phone", {
      code: "AUTH",
      module: "auth",
      userIds: matches.map((match) => match.id),
    });
    return null;
  }
  return matches[0] ?? null;
}

export async function resolvePrincipalFromCredentials(
  credentials: Credentials,
): Promise<AuthenticatedPrincipal | null> {
  const { identifier, password } = credentials;

  const user = await findUserByIdentifier(identifier);
  if (!user || !user.isActive) {
    // Spend comparable scrypt work, then fail closed — do not short-circuit.
    await verifyPassword(password, "!no-such-user");
    return null;
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) return null;

  // Active gym membership → the tenant context. MVP: a user belongs to one gym.
  const gymUser = await prisma.gymUser.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      role: { include: { rolePermissions: { include: { permission: true } } } },
    },
  });
  if (!gymUser) {
    log.warn("auth.login.no_tenant", { code: "AUTH", userId: user.id, module: "auth" });
    return null;
  }

  // Active branch context (MVP): the gym's deterministic default — oldest active.
  const branch = await prisma.branch.findFirst({
    where: { gymId: gymUser.gymId, isActive: true, archivedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!branch) {
    log.warn("auth.login.no_branch", {
      code: "AUTH",
      userId: user.id,
      gymId: gymUser.gymId,
      module: "auth",
    });
    return null;
  }

  const permissions = derivePermissions(gymUser.role.rolePermissions);

  // Record the successful sign-in instant (Staff "Last Login"). This runs only in the Credentials
  // `authorize` path — once per sign-in, never on token refresh (verified) — so it is login time,
  // not request time. Best-effort: a write hiccup must not fail an otherwise-valid login.
  try {
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: systemClock.now() } });
  } catch (error) {
    log.warn("auth.login.last_login_write_failed", {
      code: "AUTH",
      userId: user.id,
      module: "auth",
    });
    void error;
  }

  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    gymId: gymUser.gymId,
    branchId: branch.id,
    gymUserId: gymUser.id,
    permissions,
  };
}
