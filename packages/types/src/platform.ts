import type { AuthenticatedPrincipal } from "./authentication.js";

/**
 * Platform-adapter interfaces (T-26) — thin **platform boundaries**, NOT
 * repositories or business services. Domain/app code depends on these so it never
 * calls framework/runtime APIs directly (`Date.now()`, `crypto.randomUUID()`,
 * Auth.js), which keeps logic deterministically testable (inject fakes) and the
 * provider swappable. Concrete implementations live in `apps/web`.
 *
 * **Exactly three** in MVP. `IFileStorage` is intentionally deferred — there is no
 * MVP consumer (spec T-26: "do not introduce unnecessary abstractions").
 */

/** Deterministic, injectable time source (time-rules). */
export interface IClock {
  /** The current instant (UTC). */
  now(): Date;
  /** Today's date as `YYYY-MM-DD` in the given IANA time zone (gym-tz judgement). */
  today(timeZone: string): string;
}

/** Application-side id generation (UUID v7 per identifier-strategy). Distinct from
 *  DB-default row PKs — for pre-generation, correlation/dedupe keys, and test ids. */
export interface IIdGenerator {
  /** A new UUID v7 string. */
  newId(): string;
}

/**
 * The current authenticated actor, exposed via a platform abstraction sourced from
 * the Authentication Adapter session (T-19) — domain code reads the current user
 * through this, **never through Auth.js directly**.
 */
export interface ICurrentUser {
  /** The current principal, or `null` when unauthenticated. */
  get(): Promise<AuthenticatedPrincipal | null>;
  /** The current principal; throws if unauthenticated (use behind route protection). */
  require(): Promise<AuthenticatedPrincipal>;
}
