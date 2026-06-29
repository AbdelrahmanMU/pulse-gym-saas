import type { AuthenticatedPrincipal, AuthenticationAdapter, Credentials } from "@pulse/types";
import { auth, signOut as nextAuthSignOut } from "./auth";
import { resolvePrincipalFromCredentials } from "./principal";

/**
 * The Auth.js implementation of the {@link AuthenticationAdapter} (D-8). This is the
 * **seam**: everything Auth.js-specific stops here. Methods return only
 * domain-shaped values ({@link AuthenticatedPrincipal}) — no Auth.js session/token
 * type ever crosses out. A future provider (Clerk/Supabase/Keycloak) is a drop-in
 * replacement of this one file.
 */
export const authenticationAdapter: AuthenticationAdapter = {
  verifyCredentials(credentials: Credentials): Promise<AuthenticatedPrincipal | null> {
    return resolvePrincipalFromCredentials(credentials);
  },

  async getCurrentPrincipal(): Promise<AuthenticatedPrincipal | null> {
    const session = await auth();
    return session?.principal ?? null;
  },

  async signOut(): Promise<void> {
    await nextAuthSignOut({ redirectTo: "/sign-in" });
  },
};
