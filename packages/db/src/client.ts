import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

/**
 * Prisma 7 client singleton (T-09; prisma-7-strategy §5). The connection is owned
 * by the `@prisma/adapter-pg` driver adapter — the URL is read from the process
 * environment (validated by the app's env module — T-15), never from the schema.
 *
 * `@pulse/db` is **server-only** and must never be imported by UI/client code
 * (monorepo-strategy §5/§11).
 *
 * A `globalThis` guard reuses one client across Next.js dev hot-reloads, avoiding
 * connection-pool exhaustion from duplicate instances (ADR §11).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
