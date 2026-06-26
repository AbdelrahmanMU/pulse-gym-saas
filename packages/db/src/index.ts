/**
 * @pulse/db — the data-access package (server-only).
 *
 * Receives the Prisma 7 schema, `prisma.config.ts`, and the driver-adapter
 * client singleton in T-09 (Session 2); the initial migration + seed run in
 * T-11. This package is **server-only** and must never be imported by
 * `@pulse/ui` or any client/presentation code (monorepo-strategy §5, §11).
 *
 * Intentionally empty in Session 1 — no client or schema lives here yet.
 */
export {};
