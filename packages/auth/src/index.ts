/**
 * @pulse/auth — the sole home of authorization (authorization-architecture.md).
 *
 * This public entry is the **pure, dependency-free surface**: the immutable
 * permission **keys**, the authorization **catalog** (capabilities, permissions,
 * role→permission matrix — the single source the DB seed materializes), and the
 * permission **check + derivation** logic. It is server- and browser-safe, so the
 * server gate and future UI control-hiding both reuse it (§11).
 *
 * Authorization is **permission-based, never role-based**: no `requireRole`,
 * `role === …`, or `switch(role)` ever appears here (constitution §8). The scrypt
 * password primitives live in the server-only `@pulse/auth/password` subpath and are
 * intentionally NOT re-exported here (they pull `node:crypto`).
 */
export { PERMISSION_KEYS, ALL_PERMISSION_KEYS, type PermissionKey } from "./keys.js";
export {
  CAPABILITIES,
  PERMISSIONS,
  ROLES,
  type CapabilityDef,
  type PermissionDef,
  type RoleDef,
} from "./catalog.js";
export { hasPermission, derivePermissions, type RolePermissionRow } from "./authorization.js";
export { isEmailIdentifier, normalizePhone } from "./identifier.js";
