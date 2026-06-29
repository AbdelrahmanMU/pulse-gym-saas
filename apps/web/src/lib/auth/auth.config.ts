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
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
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
