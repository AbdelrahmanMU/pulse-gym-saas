import { requireSession } from "@/lib/auth/guard";
import {
  getMember,
  listAssignableTrainers,
  listMembers,
  listTrainerFilterOptions,
  type MemberDetail,
  type MemberListResult,
  type TrainerOption,
} from "./service";
import { MemberListParamsSchema } from "./validation";

/**
 * RSC read entry points for Member Management (Sprint-1 Epic-2). They resolve the
 * authenticated principal (the `(app)` layout already enforced the session) and delegate to
 * the {@link ./service} core, which authorizes **by permission** and scopes by gymId. Pages
 * call these; they never read the session or query Prisma directly (constitution §2). List
 * params are Zod-parsed from the raw URL query (all fields fall back to safe defaults).
 */

export async function loadMembers(
  rawParams: Record<string, string | undefined>,
): Promise<MemberListResult> {
  const principal = await requireSession();
  const params = MemberListParamsSchema.parse(rawParams);
  return listMembers(principal, params);
}

export async function loadMember(memberId: string): Promise<MemberDetail> {
  const principal = await requireSession();
  return getMember(principal, memberId);
}

export async function loadAssignableTrainers(): Promise<TrainerOption[]> {
  const principal = await requireSession();
  return listAssignableTrainers(principal);
}

export async function loadTrainerFilterOptions(): Promise<TrainerOption[]> {
  const principal = await requireSession();
  return listTrainerFilterOptions(principal);
}
