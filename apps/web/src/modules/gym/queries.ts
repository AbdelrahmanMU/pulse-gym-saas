import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { prisma } from "@pulse/db";
import { requireSession } from "@/lib/auth/guard";
import {
  getDefaultBranch,
  getGymSettings,
  getMyProfile,
  type BranchView,
  type GymSettingsView,
  type ProfileView,
} from "./service";

/**
 * RSC read entry points for Gym Initialization (Sprint-1 Epic-1). They resolve the
 * authenticated principal (the `(app)` layout has already enforced the session) and
 * delegate to the {@link ./service} core, which authorizes **by permission** and scopes
 * by gymId/userId. Pages call these; they never read the session or query Prisma directly.
 */

export async function loadGymSettings(): Promise<GymSettingsView> {
  const principal = await requireSession();
  return getGymSettings(principal);
}

export async function loadDefaultBranch(): Promise<BranchView> {
  const principal = await requireSession();
  return getDefaultBranch(principal);
}

export async function loadMyProfile(): Promise<ProfileView> {
  const principal = await requireSession();
  return getMyProfile(principal);
}

/**
 * Whether to route this actor into first-run onboarding: only an actor who can actually
 * complete setup (holds `gym.manage`) and whose gym is not yet marked complete. Others
 * (no setup permission) go straight to the dashboard — never forced into onboarding.
 */
export async function needsOnboarding(): Promise<boolean> {
  const principal = await requireSession();
  if (!hasPermission(principal.permissions, PERMISSION_KEYS.GYM_MANAGE)) return false;
  const gym = await prisma.gym.findUnique({
    where: { id: principal.gymId },
    select: { setupCompletedAt: true },
  });
  return gym?.setupCompletedAt == null;
}
