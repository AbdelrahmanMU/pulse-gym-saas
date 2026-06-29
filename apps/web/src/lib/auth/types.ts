import type { AuthenticatedPrincipal } from "@pulse/types";

/**
 * Auth.js module augmentation — confined to the Authentication-Adapter boundary
 * (`lib/auth/**`). The domain-shaped {@link AuthenticatedPrincipal} is the only
 * thing we carry through the JWT/session; no Auth.js type ever leaks outside this
 * directory. With the JWT strategy (no DB sessions; Credentials supports only JWT),
 * the principal — including the resolved permission set — rides in the
 * **server-signed** token, so it is authoritative and not client-tamperable.
 */
declare module "next-auth" {
  interface User {
    principal?: AuthenticatedPrincipal;
  }
  interface Session {
    principal: AuthenticatedPrincipal;
  }
}

/**
 * The JWT carries the principal too, but augmenting `next-auth/jwt` doesn't resolve
 * under this `moduleResolution: bundler` tsconfig (a known v5 quirk). The token is
 * instead narrowed at the single read/write site via {@link TokenWithPrincipal} in
 * `auth.config.ts` — kept here, beside the Session/User augmentation, for context.
 */
export interface TokenWithPrincipal {
  principal?: AuthenticatedPrincipal;
}
