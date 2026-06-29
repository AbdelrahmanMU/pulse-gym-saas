import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";

/**
 * The permission-gated placeholder protected route (T-07 demo of T-20). Access is
 * decided **by permission** (`dashboard.view`), never by role: the seeded Owner holds
 * it and sees the page; an actor without it gets a minimal forbidden notice (the full
 * Catalog `ErrorState` + 403 mapping is T-17, Session 4). The session/redirect for
 * unauthenticated access is enforced one level up in the `(app)` layout; the gate
 * here re-checks the permission (deny-by-default, server-side every time).
 *
 * No business logic lives here — `app/` is routing only (constitution §2).
 */
export default async function DashboardPage() {
  let displayName: string;
  try {
    const principal = await requirePermission(PERMISSION_KEYS.DASHBOARD_VIEW);
    displayName = principal.displayName;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return (
        <section>
          <h1>Access denied</h1>
          <p role="alert">You don&apos;t have access to this page.</p>
        </section>
      );
    }
    throw error;
  }

  return (
    <section>
      <h1>Dashboard</h1>
      <p>
        Protected placeholder route — visible because {displayName} holds the{" "}
        <code>dashboard.view</code> permission. Real dashboard content is a later phase.
      </p>
    </section>
  );
}
