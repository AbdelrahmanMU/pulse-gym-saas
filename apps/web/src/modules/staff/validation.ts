import { z } from "zod";

/**
 * Zod schemas for User & Staff Management (Sprint-1 Epic-9) — the trust boundary for every staff
 * mutation and the list query (api-standards.md). Types are derived via `z.infer`, never duplicated.
 *
 * Grounded in the existing model, not invented: a staff member is a `GymUser` linking a `User` to
 * the gym via a `Role`. Email uniqueness is a DB `@unique` on `User.email` → surfaced as a field
 * error from Prisma P2002 in the service (a pure schema can't see other rows). The temporary
 * password is owner-set (no email infra); full password-strength policy is the standing Phase-2 gap
 * (a minimum length only here).
 */

/** Optional free-text → trimmed string or null (empty becomes null, never ""). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

const displayName = z.string().trim().min(1, "A name is required").max(120, "Name is too long");

/** The staff member's identity + role + a temporary password the owner communicates out-of-band. */
export const CreateStaffSchema = z.object({
  displayName,
  email: z.string().trim().toLowerCase().max(200).email("Enter a valid email address"),
  phone: optionalText(40),
  roleId: z.string().uuid("Choose a role"),
  temporaryPassword: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200, "That password is too long"),
});
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;

/** Edit a staff member's profile (name + phone). Email is identity and role has its own control. */
export const UpdateStaffSchema = z.object({
  displayName,
  phone: optionalText(40),
});
export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>;

/** Assign (or change) a staff member's role to an assignable role in the gym's catalog. */
export const AssignRoleSchema = z.object({
  roleId: z.string().uuid("Choose a role"),
});
export type AssignRoleInput = z.infer<typeof AssignRoleSchema>;

/** The staff-list filter/search/pagination params (read from the URL query). */
export const StaffListParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  // Display "Suspended" == the schema's REVOKED status; ACTIVE default hides suspended staff.
  status: z.enum(["ACTIVE", "REVOKED", "ALL"]).catch("ACTIVE"),
  page: z.coerce.number().int().min(1).catch(1),
});
export type StaffListParams = z.infer<typeof StaffListParamsSchema>;
