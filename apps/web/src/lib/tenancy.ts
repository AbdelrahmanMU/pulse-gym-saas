import { NotFoundError } from "@/lib/errors";

/**
 * Tenant-isolation guard (ADR tenancy laws; INV-2). The `scope` step of the mutation
 * pipeline: a resource loaded for the actor's gym must belong to that gym, and a
 * mismatch must surface as **404, never 403** — we never confirm another gym's record
 * exists (api-standards.md; error-handling.md).
 *
 * Session 3 has no business resource to isolate yet (only the permission-gated
 * placeholder); this is the reusable mechanism every feature query will call once it
 * loads tenant-owned rows. The `gymId` always comes from the session, never input.
 */
export function assertSameGym(sessionGymId: string, resourceGymId: string): void {
  if (sessionGymId !== resourceGymId) {
    throw new NotFoundError();
  }
}
