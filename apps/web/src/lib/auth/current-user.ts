import type { AuthenticatedPrincipal, ICurrentUser } from "@pulse/types";
import { AuthError } from "@/lib/errors";
import { authenticationAdapter } from "./authentication-adapter";

/**
 * The platform `ICurrentUser` (T-26) — how domain/app code reads the current actor,
 * **never via Auth.js directly**. Sourced from the Authentication Adapter session
 * (T-19). `get()` is nullable for optional contexts; `require()` is for code that
 * runs behind route protection and must have an actor.
 */
export const currentUser: ICurrentUser = {
  get(): Promise<AuthenticatedPrincipal | null> {
    return authenticationAdapter.getCurrentPrincipal();
  },

  async require(): Promise<AuthenticatedPrincipal> {
    const principal = await authenticationAdapter.getCurrentPrincipal();
    if (!principal) throw new AuthError();
    return principal;
  },
};
