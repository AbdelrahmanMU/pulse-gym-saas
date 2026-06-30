import { z } from "zod";

/**
 * Zod schemas for Payments (Sprint-1 Epic-5) — the trust boundary for recording and voiding.
 * Types are derived via `z.infer`, never duplicated. The **amount** is accepted as a plain
 * major-unit string and parsed to exact minor units in the service (the single parse authority —
 * `lib/money`), so money is never a float and over-precision is rejected there as a field error.
 *
 * This module is **client-safe** (imported by the record-payment form), so it must not import the
 * server-only `@pulse/db` package (monorepo-strategy §5/§11). The payment-method vocabulary is
 * declared here as plain string literals that mirror the `PaymentMethod` enum (DDS §1.8) — the
 * same pattern Plan validation uses for `DURATION_UNITS`. Prisma generates that enum as a string-
 * literal union, so the values stay interchangeable with the db type.
 *
 * Deliberately NOT captured (out of scope / no column): refunds, discounts, taxes, multi-currency
 * (currency is inherited from the membership snapshot, never entered).
 */

/** The four MVP payment methods (controlled vocabulary — mirrors the `PaymentMethod` db enum). */
export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CARD_MANUAL", "OTHER"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

/** Optional `YYYY-MM-DD` payment date (gym tz) → the string or null; the service defaults to today. */
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

/**
 * Record a payment: a non-negative major-unit amount string (parsed + range-checked `> 0` in the
 * service against the membership currency), a method, an optional payment date, and an optional
 * note. Currency and membership are NOT in the form — currency is inherited from the snapshot and
 * the membership id rides a trusted route/hidden field, re-scoped server-side.
 */
export const RecordPaymentSchema = z.object({
  amount: z
    .string({ message: "Enter an amount" })
    .trim()
    .min(1, "Enter an amount")
    .max(20, "That amount is too long"),
  method: z.enum(PAYMENT_METHODS, { message: "Choose a payment method" }),
  receivedOn: optionalIsoDate,
  note: z
    .string()
    .trim()
    .max(500, "Keep the note under 500 characters")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

/** Void a payment: an optional reason for the audit trail. The target id rides a hidden field. */
export const VoidPaymentSchema = z.object({
  voidReason: z
    .string()
    .trim()
    .max(500, "Keep the reason under 500 characters")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type VoidPaymentInput = z.infer<typeof VoidPaymentSchema>;
