import { prisma } from "@pulse/db";
import { derivePermissions } from "@pulse/auth";
import { verifyPassword } from "@pulse/auth/password";
import type { AuthenticatedPrincipal, Credentials } from "@pulse/types";
import { log } from "@/lib/logger";

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
 */
export async function resolvePrincipalFromCredentials(
  credentials: Credentials,
): Promise<AuthenticatedPrincipal | null> {
  const { email, password } = credentials;

  const user = await prisma.user.findUnique({ where: { email } });
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
