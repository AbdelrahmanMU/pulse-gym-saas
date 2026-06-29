/**
 * @pulse/types — shared, dependency-free contracts.
 *
 * The home for cross-cutting type contracts and the platform-adapter /
 * Authentication-Adapter interfaces (T-19 / T-26). This package stays
 * dependency-free (monorepo-strategy §4) and contains **no runtime logic** — types
 * and interfaces only.
 */
export type {
  Credentials,
  AuthenticatedPrincipal,
  AuthenticationAdapter,
} from "./authentication.js";
export type { IClock, IIdGenerator, ICurrentUser } from "./platform.js";
