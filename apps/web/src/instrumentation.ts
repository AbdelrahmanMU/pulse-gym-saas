import type { Instrumentation } from "next";
import { log } from "@/lib/logger";

/**
 * Server-side error sink (T-17). Next.js calls `onRequestError` **once** for every error
 * thrown during a server render / route handler — this is where the boundary's full
 * context is logged (the React `error.tsx` is a Client Component and cannot reach Pino /
 * AsyncLocalStorage). The user-facing UI shows Next's `error.digest`; we log that same
 * digest here so a support reference correlates to this server log. Ids, not bodies
 * (logging-observability.md) — Pino `redact` is the backstop.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest?: unknown }).digest)
      : undefined;

  log.error("request.error", {
    code: "UNEXPECTED",
    module: "boundary",
    err: error,
    digest,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
  });
};
