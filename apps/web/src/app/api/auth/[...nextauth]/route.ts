import { handlers } from "@/lib/auth/auth";

/**
 * Auth.js HTTP endpoints (sign-in/out, session, CSRF) under `/api/auth/*`. It
 * re-exports the adapter's `handlers` — it does not import `next-auth` directly.
 * Runs in the Node runtime (Credentials `authorize` does Prisma + scrypt; never Edge).
 */
export const runtime = "nodejs";

export const { GET, POST } = handlers;
