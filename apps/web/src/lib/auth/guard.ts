import { redirect } from "next/navigation";
import { hasPermission, type PermissionKey } from "@pulse/auth";
import type { AuthenticatedPrincipal } from "@pulse/types";
import { AuthorizationError } from "@/lib/errors";
import { currentUser } from "./current-user";

/**
 * Server-side authorization gate for **RSC / layouts** (T-20). The sole way
 * protected server-rendered code decides access — always by **permission**, never by
 * role (constitution §8). Unauthenticated → `redirect('/sign-in')`; missing
 * permission → throw {@link AuthorizationError} (the route renders a minimal
 * forbidden notice). The pure Route-Handler/Action gate is `authorize` in `assert.ts`.
 */

/** RSC: ensure an authenticated, gym-scoped actor, else redirect to sign-in. */
export async function requireSession(): Promise<AuthenticatedPrincipal> {
  const principal = await currentUser.get();
  if (!principal) redirect("/sign-in");
  return principal;
}

/** RSC: ensure the actor holds `key`; redirect if unauth, throw 403 if missing. */
export async function requirePermission(key: PermissionKey): Promise<AuthenticatedPrincipal> {
  const principal = await requireSession();
  if (!hasPermission(principal.permissions, key)) {
    throw new AuthorizationError();
  }
  return principal;
}
