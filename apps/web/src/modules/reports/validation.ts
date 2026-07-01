import { z } from "zod";

/**
 * Reports input validation (Epic-8). Only the Revenue report takes free input — a custom date range.
 * Both bounds must be valid calendar days (`YYYY-MM-DD`) and `from ≤ to`; anything else is treated as
 * "no custom range" so the report still renders its standard buckets. The membership report reuses the
 * memberships module's own `MembershipListParamsSchema` (no duplicate schema).
 */
export const RevenueRangeSchema = z
  .object({ from: z.string().date(), to: z.string().date() })
  .refine((v) => v.from <= v.to, {
    message: "The end date must not be before the start.",
    path: ["to"],
  });

export interface RevenueRange {
  fromIso: string;
  toIso: string;
}

/** Parse an optional custom range from raw query params; invalid/partial input → `null`. */
export function parseRevenueRange(from?: string, to?: string): RevenueRange | null {
  if (!from || !to) return null;
  const parsed = RevenueRangeSchema.safeParse({ from, to });
  return parsed.success ? { fromIso: parsed.data.from, toIso: parsed.data.to } : null;
}
