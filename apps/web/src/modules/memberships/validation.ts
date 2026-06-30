import { z } from "zod";

/**
 * Zod schemas for Membership Lifecycle (Sprint-1 Epic-4) — the trust boundary for every
 * lifecycle mutation and the list query (api-standards.md). Types are derived via `z.infer`,
 * never duplicated. Rules are grounded in the domain docs, not invented.
 *
 * **Deliberately NOT captured (no column → would be a forbidden schema change; flagged in
 * the verification report):** membership *notes*, a membership-level *responsible trainer*
 * (a member-level relationship owned by the members module — INV-37), a *freeze reason*, and
 * a *cancellation reason*. The membership detail surfaces the member's current trainer
 * read-only. Adding any of these is a future migration, not this slice.
 */

/** Optional `YYYY-MM-DD` calendar day (gym tz) → the string or null; the service defaults to today. */
const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date")
  .refine(
    (v) => v === null || !Number.isNaN(Date.parse(`${v}T00:00:00.000Z`)),
    "Enter a valid date",
  );

/** Sell a membership: a member + an active plan, optional start date (defaults to today). */
export const CreateMembershipSchema = z.object({
  memberId: z.string().uuid("Choose a member"),
  planId: z.string().uuid("Choose a plan"),
  startDate: optionalIsoDate,
});
export type CreateMembershipInput = z.infer<typeof CreateMembershipSchema>;

/** Upgrade/downgrade: the new target plan (deferred — UPG-1). Direction is computed in the service. */
export const UpgradeMembershipSchema = z.object({
  planId: z.string().uuid("Choose a plan"),
});
export type UpgradeMembershipInput = z.infer<typeof UpgradeMembershipSchema>;

/**
 * Freeze: a whole number of frozen days (FRZ-1). No hard cap in MVP (OQ-7) — the 3650 ceiling
 * is a pragmatic input guard, not a business rule. Freeze starts today (gym tz).
 */
export const FreezeMembershipSchema = z.object({
  frozenDays: z.coerce
    .number({ message: "Enter a whole number of days" })
    .int("Must be a whole number")
    .min(1, "Freeze must be at least 1 day")
    .max(3650, "That freeze is unusually long — enter 3650 days or fewer"),
});
export type FreezeMembershipInput = z.infer<typeof FreezeMembershipSchema>;

/** The memberships-list filter/search/pagination params (read from the URL query). */
export const MembershipListParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  status: z.enum(["ACTIVE", "SCHEDULED", "FROZEN", "EXPIRED", "CANCELLED", "ALL"]).catch("ALL"),
  page: z.coerce.number().int().min(1).catch(1),
});
export type MembershipListParams = z.infer<typeof MembershipListParamsSchema>;
