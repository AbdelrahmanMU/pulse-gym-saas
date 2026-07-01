import { requireSession } from "@/lib/auth/guard";
import {
  getStaff,
  listAssignableRoles,
  listStaff,
  type RoleOption,
  type StaffDetail,
  type StaffListResult,
} from "./service";
import { StaffListParamsSchema } from "./validation";

/**
 * RSC read entry points for User & Staff Management (Sprint-1 Epic-9). They resolve the
 * authenticated principal (the `(app)` layout already enforced the session) and delegate to the
 * {@link ./service} core, which authorizes **by permission** and scopes by gymId. Pages call these;
 * they never read the session or query Prisma directly (constitution §2). List params are Zod-parsed
 * from the raw URL query (all fields fall back to safe defaults).
 */

export async function loadStaff(
  rawParams: Record<string, string | undefined>,
): Promise<StaffListResult> {
  const principal = await requireSession();
  const params = StaffListParamsSchema.parse(rawParams);
  return listStaff(principal, params);
}

export async function loadStaffMember(gymUserId: string): Promise<StaffDetail> {
  const principal = await requireSession();
  return getStaff(principal, gymUserId);
}

export async function loadAssignableRoles(): Promise<RoleOption[]> {
  const principal = await requireSession();
  return listAssignableRoles(principal);
}
