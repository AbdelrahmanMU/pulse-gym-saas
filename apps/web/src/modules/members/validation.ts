import { z } from "zod";

/**
 * Zod schemas for Member Management (Sprint-1 Epic-2) — the trust boundary for every
 * member mutation and the list query (api-standards.md). Types are derived via `z.infer`,
 * never duplicated. Rules are grounded in the domain docs, not invented:
 *   • name required, ≥1 char                                   (MBR-2 / INV-9)
 *   • at least one contact method (phone OR email)              (MBR-2 / INV-9, DB CHECK)
 *   • contact uniqueness within a gym is a DB partial-unique    (MBR-3 / INV-3) — surfaced
 *     as a field error from Prisma P2002 in the service, NOT validated here (can't see
 *     other rows from a pure schema).
 * Text length caps are pragmatic UX guards (the DDS specifies none for these columns).
 */

/** Optional free-text → trimmed string or null (empty becomes null, never ""). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

/** Optional email → validated, or null when blank. */
const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .email("Enter a valid email address")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v && v.length > 0 ? v : null));

/** Optional `YYYY-MM-DD` (from a date input) → midnight-UTC `Date` for a `@db.Date`, or null. */
const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Enter a valid date")
  .transform((v) => (v === null ? null : new Date(`${v}T00:00:00.000Z`)));

/**
 * Create/edit a member. Home branch is set from the session (MVP single branch), never
 * accepted from input. Status/archival are not edited here — they move via the dedicated
 * archive/reactivate actions (ARC-1/2).
 */
export const MemberSchema = z
  .object({
    fullName: z.string().trim().min(1, "Member name is required").max(120, "Name is too long"),
    phone: optionalText(40),
    email: optionalEmail,
    dateOfBirth: optionalDate,
    gender: optionalText(40),
    joinedOn: optionalDate,
    // notesSummary is intentionally NOT written here — member notes are out of this epic's
    // scope, and collecting it on the edit form would null the column on every save.
  })
  .refine((d) => d.phone !== null || d.email !== null, {
    message: "Add a phone number or an email — a member needs at least one contact method.",
    path: ["phone"],
  });
export type MemberInput = z.infer<typeof MemberSchema>;

/** Assign (or reassign) a member's responsible trainer to an active GymUser in the gym. */
export const AssignTrainerSchema = z.object({
  trainerGymUserId: z.string().uuid("Choose a staff member"),
});
export type AssignTrainerInput = z.infer<typeof AssignTrainerSchema>;

/** The members-list filter/search/pagination params (read from the URL query). */
export const MemberListParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  status: z.enum(["ACTIVE", "ARCHIVED", "ALL"]).catch("ACTIVE"),
  // A GymUser id, the sentinel "UNASSIGNED", or "ALL" (no trainer filter).
  trainer: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "ALL")),
  page: z.coerce.number().int().min(1).catch(1),
});
export type MemberListParams = z.infer<typeof MemberListParamsSchema>;
