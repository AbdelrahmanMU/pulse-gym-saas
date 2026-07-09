import { z } from "zod";

/**
 * Zod schemas for Plan Management (Sprint-1 Epic-3) — the trust boundary for every plan
 * mutation and the list query (api-standards.md). Types are derived via `z.infer`. Rules are
 * grounded in the domain docs, not invented:
 *   • name required                                            (PLN-1)
 *   • duration value ≥ 1, unit ∈ {DAY,WEEK,MONTH}              (PLN-1; DB CHECK duration_value > 0)
 *   • price is a plain non-negative decimal STRING here; exact conversion to integer minor
 *     units + the per-currency precision check happen in the service (the schema can't see
 *     the gym's currency). Money is never a float (money-rules M-1).
 * The currency is NOT user-entered — it is the gym's default currency (money-rules §1).
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

export const DURATION_UNITS = ["DAY", "WEEK", "MONTH"] as const;

export const PlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(120, "Name is too long"),
  description: optionalText(2000),
  durationValue: z.coerce
    .number({ message: "Enter a whole number of periods" })
    .int("Must be a whole number")
    .min(1, "Duration must be at least 1"),
  durationUnit: z.enum(DURATION_UNITS, { message: "Choose a duration unit" }),
  // Plain, unseparated, non-negative decimal. Precision-vs-currency is enforced server-side.
  price: z
    .string()
    .trim()
    .max(20)
    .regex(/^\d+(\.\d+)?$/, "Enter a valid price (e.g. 29.99)"),
});
export type PlanInput = z.infer<typeof PlanSchema>;

/** The plans-list filter/search/pagination params (read from the URL query). */
export const PlanListParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  status: z.enum(["ACTIVE", "ARCHIVED", "ALL"]).catch("ACTIVE"),
  page: z.coerce.number().int().min(1).catch(1),
});
export type PlanListParams = z.infer<typeof PlanListParamsSchema>;
