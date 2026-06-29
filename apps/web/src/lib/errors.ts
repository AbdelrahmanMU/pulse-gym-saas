/**
 * Minimal typed-error taxonomy (error-handling.md). Session 3 needs the
 * authentication/authorization/not-found classes so the gate can fail in a typed,
 * mappable way; the full React error boundary + Catalog `ErrorState` mapping is
 * T-17 (Session 4). Each error carries a stable `code` and an HTTP `status` so a
 * boundary/handler maps it deterministically without leaking internals.
 *
 * Cross-tenant access surfaces as **404** (NotFoundError), never 403 — never
 * confirm another gym's record exists (api-standards.md; error-handling.md).
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;
}

/** Not authenticated → 401. */
export class AuthError extends AppError {
  readonly code = "AUTH";
  readonly status = 401;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthError";
  }
}

/** Authenticated but lacks the required permission → 403. */
export class AuthorizationError extends AppError {
  readonly code = "FORBIDDEN";
  readonly status = 403;
  constructor(message = "You don't have access") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Missing, or out-of-tenant (cross-tenant disguised as absent) → 404. */
export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly status = 404;
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
