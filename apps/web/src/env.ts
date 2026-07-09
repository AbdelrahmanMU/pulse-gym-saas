import { z } from "zod";

/**
 * Fail-fast, Zod-validated environment configuration (T-15; security-guidelines
 * §Environment Variables). The schema parses `process.env` once at startup and
 * the app **refuses to boot** on a missing/malformed required variable, rather
 * than failing at the first request.
 *
 * Server-only: this module reads secrets and must never be imported by client
 * code. Only `NEXT_PUBLIC_`-prefixed values may ever cross to the browser; none
 * exist yet.
 */
const envSchema = z.object({
  // PostgreSQL connection string consumed by the Prisma driver adapter (T-09/T-10).
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Auth.js signing secret. Required from Session 2 so the boot contract is stable
  // before authentication wiring lands in Session 3 (T-19).
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  // Standard Node lifecycle flag; defaults to development when unset.
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = Readonly<z.infer<typeof envSchema>>;

/**
 * Pure parser over an arbitrary source — used by the validated singleton below
 * and directly by unit tests (so tests need not mutate `process.env`). Throws a
 * single, clear, multi-line error listing every offending variable; the message
 * never echoes the offending **value** (no secret leakage).
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration — the application cannot start.\n${issues}`);
  }
  return Object.freeze(result.data);
}

/** The validated, frozen, typed environment. Importing this triggers validation. */
export const env: Env = parseEnv(process.env);
