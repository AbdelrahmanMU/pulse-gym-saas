import type { PermissionKey } from "./keys.js";

/**
 * The permission-check + permission-derivation logic (authorization-architecture.md
 * §1/§7/§11). This module is **pure and dependency-free** (no DB, no framework), so
 * the server gate *and* future UI control-hiding can both reuse it (§11). The DB
 * read of `GymUser→Role→RolePermission` happens in the consumer (apps/web); the
 * *derivation* — turning those rows into the held-permission set — is centralized
 * here, which keeps `@pulse/auth` the sole authorization home without an
 * `@pulse/auth ↔ @pulse/db` cycle.
 *
 * **Permission-based, never role-based**: nothing here branches on a role name.
 */

/** The minimal shape of a role→permission join row needed to derive a key set. */
export interface RolePermissionRow {
  readonly permission: { readonly key: string };
}

/**
 * Derive the deduplicated set of permission **keys** an actor holds from their
 * role's permission mappings. The single place role membership becomes a
 * permission set; callers then check permissions only.
 */
export function derivePermissions(rolePermissions: readonly RolePermissionRow[]): string[] {
  return [...new Set(rolePermissions.map((rp) => rp.permission.key))];
}

/**
 * Does the actor hold the required permission? **Deny by default** — a permission
 * absent from `held` is a denial. `held` is the actor's resolved permission set
 * (from {@link derivePermissions}); `required` must be a known `PermissionKey`
 * constant, never a raw string (T-27 hardcoded-permission guard).
 */
export function hasPermission(held: readonly string[], required: PermissionKey): boolean {
  return held.includes(required);
}
