/**
 * Authentication contracts (T-19; D-8). The **domain-shaped** principal and the
 * replaceable Authentication-Adapter seam. Application/domain code depends on these
 * interfaces — **never on Auth.js types** — so the auth provider (Auth.js today;
 * Clerk/Supabase/Keycloak later) is swapped by replacing only the adapter
 * implementation. No Auth.js/`next-auth` type ever appears in this file.
 *
 * `@pulse/types` is dependency-free (monorepo-strategy §4): these are pure types.
 */

/**
 * Plaintext credentials presented at sign-in (validated/handled only server-side).
 * The identifier is a **phone number or an email** in one field (Pilot Readiness:
 * gym staff identify people by phone first); the server resolves which it is.
 */
export interface Credentials {
  readonly identifier: string;
  readonly password: string;
}

/**
 * The authenticated actor in domain terms: a global `User` identity resolved into
 * an active gym/branch tenant context with its **resolved permission-key set**.
 * This is the only shape that crosses the adapter boundary — no framework session
 * object leaks out. Permissions are plain keys (the `PermissionKey` union lives in
 * `@pulse/auth`; kept as `string[]` here to keep `@pulse/types` dependency-free and
 * acyclic).
 */
export interface AuthenticatedPrincipal {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  /** Active tenant (from the actor's GymUser; taken from the session, never input). */
  readonly gymId: string;
  /** Active branch context (MVP: the gym's default branch). */
  readonly branchId: string;
  /** The GymUser link id for this actor in the active gym. */
  readonly gymUserId: string;
  /** Permission keys the actor holds in the active gym (deny-by-default elsewhere). */
  readonly permissions: readonly string[];
}

/**
 * The replaceable authentication seam. Confines the auth provider behind a stable
 * contract: credential verification, current-session retrieval (domain-shaped), and
 * sign-out. The concrete implementation (Auth.js) is the single place `next-auth`
 * may be imported (T-27 rule ⑥).
 */
export interface AuthenticationAdapter {
  /** Verify credentials; resolve a domain principal, or `null` if invalid/ineligible. */
  verifyCredentials(credentials: Credentials): Promise<AuthenticatedPrincipal | null>;
  /** The current session's principal, or `null` when unauthenticated. */
  getCurrentPrincipal(): Promise<AuthenticatedPrincipal | null>;
  /** Invalidate the current session. */
  signOut(): Promise<void>;
}
