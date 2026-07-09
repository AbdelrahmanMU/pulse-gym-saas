/**
 * @pulse/db — the data-access package (server-only; T-09).
 *
 * Public entry: the Prisma client singleton plus the generated `Prisma` namespace,
 * `PrismaClient` type, model types, and enums. This package is **server-only** and
 * must never be imported by `@pulse/ui` or any client/presentation code
 * (monorepo-strategy §5/§11). Consumers import the singleton (`prisma`), never the
 * generated client directly.
 */
export { prisma } from "./client.js";
export * from "./generated/prisma/client.js";
