import { z } from "zod";

/**
 * Zod schemas for Gym Initialization (Sprint-1 Epic-1) — the trust boundary for every
 * gym/branch/profile mutation (api-standards.md). Types are derived via `z.infer`, never
 * duplicated. Rules are grounded in the domain docs, not invented:
 *   • currency → ISO-4217 (money-rules §1), validated against the runtime's known set
 *   • timeZone → IANA identifier (time-rules §1), validated against the runtime's set
 *   • expiringSoonWindowDays / gracePeriodDays → integer ≥ 0 (mirrors the DB CHECK)
 * Text length caps are pragmatic UX guards (the DDS specifies none for these columns).
 */

// ISO-4217 / IANA membership from the platform (no hardcoded list to drift).
const CURRENCY_CODES = new Set(Intl.supportedValuesOf("currency"));
const TIME_ZONES = new Set(Intl.supportedValuesOf("timeZone"));

/** Optional free-text → trimmed string or null (empty becomes null, never ""). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

export const GymSettingsSchema = z.object({
  name: z.string().trim().min(1, "Gym name is required").max(120, "Name is too long"),
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .email("Enter a valid email address")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  contactPhone: optionalText(40),
  defaultCurrency: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .refine((c) => CURRENCY_CODES.has(c), "Unknown currency code (ISO-4217)"),
  timeZone: z
    .string()
    .trim()
    .refine((tz) => TIME_ZONES.has(tz), "Unknown time zone (IANA)"),
  expiringSoonWindowDays: z.coerce
    .number({ message: "Enter a whole number of days" })
    .int("Must be a whole number")
    .min(0, "Must be 0 or more"),
  gracePeriodDays: z.coerce
    .number({ message: "Enter a whole number of days" })
    .int("Must be a whole number")
    .min(0, "Must be 0 or more"),
});
export type GymSettingsInput = z.infer<typeof GymSettingsSchema>;

/** Structured branch address → the `Branch.address` JSON column (a validation shape). */
export const BranchAddressSchema = z.object({
  line1: optionalText(160),
  line2: optionalText(160),
  city: optionalText(80),
  region: optionalText(80),
  postalCode: optionalText(20),
  country: optionalText(80),
});

export const BranchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required").max(120, "Name is too long"),
  contactPhone: optionalText(40),
  address: BranchAddressSchema,
  // Checkbox: present ("on"/"true") = active; absent = inactive.
  isActive: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});
export type BranchInput = z.infer<typeof BranchSchema>;

export const OwnProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(120, "Name is too long"),
  phone: optionalText(40),
  avatarUrl: z
    .string()
    .trim()
    .max(2048)
    .url("Enter a valid URL")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type OwnProfileInput = z.infer<typeof OwnProfileSchema>;
