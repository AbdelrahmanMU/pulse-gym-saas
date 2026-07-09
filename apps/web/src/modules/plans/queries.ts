import { requireSession } from "@/lib/auth/guard";
import {
  getGymCurrency,
  getPlan,
  listPlans,
  type PlanDetail,
  type PlanListResult,
} from "./service";
import { PlanListParamsSchema } from "./validation";

/**
 * RSC read entry points for Plan Management (Sprint-1 Epic-3). They resolve the
 * authenticated principal (the `(app)` layout already enforced the session) and delegate to
 * the {@link ./service} core, which authorizes **by permission** and scopes by gymId. Pages
 * call these; they never read the session or query Prisma directly (constitution §2).
 */
export async function loadPlans(
  rawParams: Record<string, string | undefined>,
): Promise<PlanListResult> {
  const principal = await requireSession();
  return listPlans(principal, PlanListParamsSchema.parse(rawParams));
}

export async function loadPlan(planId: string): Promise<PlanDetail> {
  const principal = await requireSession();
  return getPlan(principal, planId);
}

export async function loadGymCurrency(): Promise<string> {
  const principal = await requireSession();
  return getGymCurrency(principal);
}
