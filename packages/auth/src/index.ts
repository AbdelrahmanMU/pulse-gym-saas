/**
 * @pulse/auth — the sole home of authorization (authorization-architecture.md).
 *
 * Receives the permission **keys**, the capability→permission and
 * role→permission mappings (as data, seeded in T-11), and the
 * `hasPermission(session, key)` check plus the server-side permission-gate in
 * T-20 (Session 3). Authorization is **permission-based, never role-based**:
 * no `requireRole`, `role === …`, or `switch(role)` ever appears here
 * (constitution §8). No other package re-implements authorization.
 *
 * Intentionally empty in Session 1 — no permission logic lives here yet.
 */
export {};
