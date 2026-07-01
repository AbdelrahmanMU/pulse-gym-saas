import { requireSession } from "@/lib/auth/guard";
import { getDashboardData, type DashboardData } from "./read-model";

/**
 * RSC read entry point for the Operations Dashboard (Epic-6). Resolves the authenticated principal
 * (the `(app)` layout already enforced the session) and delegates to the {@link ./read-model}
 * composition, which authorizes `dashboard.view` and scopes by gymId. The page calls this; it never
 * reads the session or queries Prisma directly (constitution §2).
 */
export async function loadDashboard(): Promise<DashboardData> {
  const principal = await requireSession();
  return getDashboardData(principal);
}
