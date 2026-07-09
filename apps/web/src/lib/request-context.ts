import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request context threaded through the server via AsyncLocalStorage so every
 * log line can carry the correlation id and tenant scope without passing them
 * explicitly (logging-observability.md — "a correlation id … threaded through the
 * operation"). Carries **ids, never bodies**.
 */
export interface RequestContext {
  readonly correlationId: string;
  readonly gymId?: string;
  readonly branchId?: string;
  readonly userId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Run `fn` with the given request context bound for the duration of the call. */
export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

/** The active request context, or `undefined` outside a request scope. */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** A correlation id for a new request (URL-safe, no dependency). */
export function newCorrelationId(): string {
  return crypto.randomUUID();
}
