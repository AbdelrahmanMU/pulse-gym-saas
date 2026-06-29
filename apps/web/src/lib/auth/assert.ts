import { hasPermission, type PermissionKey } from "@pulse/auth";
import type { AuthenticatedPrincipal } from "@pulse/types";
import { AuthError, AuthorizationError } from "@/lib/errors";

/**
 * The **pure** permission assertion used by Route Handlers / Server Actions (T-20).
 * Deliberately framework-free (no `next/navigation`, no session import) so it is
 * directly unit-testable and reusable. Throws {@link AuthError} (401) when there is
 * no actor, {@link AuthorizationError} (403) when the permission is absent
 * (deny-by-default), and returns the actor on success. The caller maps the thrown
 * typed error to an HTTP response.
 */
export function authorize(
  principal: AuthenticatedPrincipal | null,
  key: PermissionKey,
): AuthenticatedPrincipal {
  if (!principal) throw new AuthError();
  if (!hasPermission(principal.permissions, key)) throw new AuthorizationError();
  return principal;
}
