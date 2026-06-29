import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * The Auth.js runtime, instantiated from {@link authConfig}. `handlers` backs the
 * `/api/auth/[...nextauth]` route; `signIn`/`signOut` drive the sign-in/out server
 * actions; `auth` reads the current session. These are consumed **only** by other
 * files in `lib/auth/**` (the adapter) and the auth route handler — never by domain
 * code, which depends on the `AuthenticationAdapter` / `ICurrentUser` instead.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
