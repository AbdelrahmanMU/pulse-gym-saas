import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/guard";
import { signOutAction } from "./actions";

/**
 * Authenticated segment layout (T-07). Enforces an authenticated, gym-scoped session
 * at the boundary — **server-side**, not just in the UI: `requireSession()` redirects
 * to `/sign-in` when there is no valid session. The real application shell (AppShell/
 * Sidebar/TopBar from the Catalog) lands in Session 4 (T-08); this is the minimal
 * authenticated chrome proving protection + session context.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const principal = await requireSession();

  return (
    <div>
      <header>
        <span>
          Signed in as {principal.displayName} ({principal.email})
        </span>
        <form action={signOutAction}>
          <button type="submit">Sign out</button>
        </form>
      </header>
      <main>{children}</main>
    </div>
  );
}
