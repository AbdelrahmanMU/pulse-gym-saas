import { cache } from "react";
import type { AuthenticatedPrincipal, AuthenticationAdapter, Credentials } from "@pulse/types";
import { auth, signOut as nextAuthSignOut } from "./auth";
import { resolvePrincipalFromCredentials } from "./principal";

// Per-request memo (React cache): one render commonly calls requireSession /
// requirePermission / currentUser several times (layout + page + each query guard —
// up to 8 JWT decodes per render measured in the performance investigation). The
// session cookie cannot change mid-request, so decode it once per request. This is
// request-scoped only — never a cross-request cache.
const getPrincipalOnce = cache(async (): Promise<AuthenticatedPrincipal | null> => {
  const session = await auth();
  return session?.principal ?? null;
});

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

  getCurrentPrincipal(): Promise<AuthenticatedPrincipal | null> {
    return getPrincipalOnce();
  },

  async signOut(): Promise<void> {
    await nextAuthSignOut({ redirectTo: "/sign-in" });
  },
};
