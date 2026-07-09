import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { log } from "@/lib/logger";
import { resolvePrincipalFromCredentials } from "./principal";
import type { TokenWithPrincipal } from "./types";
import "./types";

/**
 * Auth.js (v5) configuration — **the single place `next-auth` is imported** outside
 * nothing else (T-27 rule ⑥; the `lib/auth/**` lint exception scopes it here). It is
 * confined behind the `AuthenticationAdapter`: app/domain code never imports this.
 *
 * Session strategy is **JWT** — Credentials supports only JWT, and the frozen schema
 * has no `Session`/`Account` tables, so this avoids a forbidden migration. The
 * resolved {@link AuthenticatedPrincipal} (including the permission set) rides in the
 * server-signed token and is copied to the session.
 */

// Boundary validation (security-guidelines.md): credentials are untrusted input.
// The identifier is ONE field carrying a phone number or an email — shape-based
// resolution happens in `resolvePrincipalFromCredentials`, so only presence and a
// sane length are enforced here (a `.email()` gate would reject phone sign-in).
const credentialsSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1),
});

export const authConfig: NextAuthConfig = {
  // JWT sessions carry no server-side revocation, so an already-signed-in principal
  // stays valid until the token expires. Auth.js defaults that to 30 days; we bound it
  // to 12h so a suspended/removed staff member (suspension only blocks NEW sign-ins —
  // TD-10a) loses their live session within a working day. The complementary
  // per-request account-status re-check is deferred to post-pilot (see the pilot
  // release checklist). This TTL is unrelated to the Performance-Recovery router-cache
  // matched set (that tuned navigation/mutation behaviour, not token lifetime).
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  trustHost: true,
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: { identifier: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const principal = await resolvePrincipalFromCredentials(parsed.data);
        if (!principal) return null;

        // Audit/info log — ids only, never credentials or bodies (T-16).
        log.info("auth.login", {
          code: "AUTH",
          module: "auth",
          userId: principal.userId,
          gymId: principal.gymId,
          branchId: principal.branchId,
        });

        // Becomes `user` in the jwt callback; carries the domain principal only.
        return {
          id: principal.userId,
          email: principal.email,
          name: principal.displayName,
          principal,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user?.principal) (token as TokenWithPrincipal).principal = user.principal;
      return token;
    },
    session: ({ session, token }) => {
      const principal = (token as TokenWithPrincipal).principal;
      if (principal) session.principal = principal;
      return session;
    },
  },
};
