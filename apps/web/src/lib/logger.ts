import pino from "pino";
import { getRequestContext } from "./request-context";

/**
 * The single structured logger (T-16; logging-observability.md). One Pino JSON
 * line per event with the standard fields
 * `{ timestamp, level, message, code, correlationId, gymId, branchId, userId, module, durationMs? }`.
 *
 * App code calls this wrapper — never Pino or `console` directly (the latter is
 * lint-forbidden) — so the logger stays swappable. Per-request correlation +
 * tenant scope are pulled from AsyncLocalStorage (request-context.ts). Secrets and
 * PII are stripped by Pino `redact`: we log **ids, not bodies**.
 */

// Paths Pino blanks before anything is written — passwords, tokens, auth headers,
// connection strings, and any raw request/response body. Defense-in-depth: app
// code must never pass these, but a mistake is censored rather than leaked.
const REDACT_PATHS = [
  "password",
  "*.password",
  "passwordHash",
  "*.passwordHash",
  "token",
  "*.token",
  "accessToken",
  "*.accessToken",
  "refreshToken",
  "*.refreshToken",
  "secret",
  "*.secret",
  "authorization",
  "*.authorization",
  "headers.authorization",
  "req.headers.authorization",
  "AUTH_SECRET",
  "*.AUTH_SECRET",
  "DATABASE_URL",
  "*.DATABASE_URL",
  "body",
  "*.body",
  "req.body",
  "res.body",
];

export function createBaseLogger(destination?: pino.DestinationStream): pino.Logger {
  return pino(
    {
      level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
      // Standard field names (logging-observability.md): `message`, `timestamp`,
      // and the level as a label (`info`) rather than a numeric code.
      messageKey: "message",
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      formatters: {
        level: (label) => ({ level: label }),
      },
      // Drop Pino's default pid/hostname bindings — noise for this app.
      base: undefined,
      redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
      serializers: { err: pino.stdSerializers.err },
    },
    destination,
  );
}

const baseLogger = createBaseLogger();

/** Structured fields a caller may attach to a log event. */
export interface LogFields {
  /** Stable machine code from the error taxonomy (error-handling.md). */
  code?: string;
  /** The feature/module the event originates from. */
  module?: string;
  /** Operation duration for performance logging. */
  durationMs?: number;
  /** A serialized error (uses Pino's std err serializer). */
  err?: unknown;
  [key: string]: unknown;
}

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, message: string, fields: LogFields): void {
  const context = getRequestContext();
  baseLogger[level]({ ...context, ...fields }, message);
}

export const log = {
  debug: (message: string, fields: LogFields = {}): void => emit("debug", message, fields),
  info: (message: string, fields: LogFields = {}): void => emit("info", message, fields),
  warn: (message: string, fields: LogFields = {}): void => emit("warn", message, fields),
  error: (message: string, fields: LogFields = {}): void => emit("error", message, fields),
};
