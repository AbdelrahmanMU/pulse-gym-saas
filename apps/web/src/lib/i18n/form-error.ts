"use client";

import { useTranslations } from "next-intl";

/**
 * Localize a server/Zod error string for display. The error **bodies** are produced in the
 * domain validation/service layer in English (the frozen source language); rather than couple
 * that layer to i18n (it runs outside a request context in the integration tests), the client
 * maps the known, static messages to the `formErrors` catalog namespace so forms render Arabic.
 *
 * This keeps the seam presentation-only: no Arabic is hardcoded here (only English→code), and an
 * unknown or dynamically-composed message (e.g. the multi-reason archive-blocked sentence) falls
 * back to the English source — a documented Tier-2 residual, not a silent gap.
 */
const CODE: Record<string, string> = {
  // members — validation (validation.ts) + service field/contact errors
  "Member name is required": "memberNameRequired",
  "Name is too long": "nameTooLong",
  "Enter a valid email address": "emailInvalid",
  "Enter a valid date": "dateInvalid",
  "Add a phone number or an email — a member needs at least one contact method.": "contactRequired",
  "Choose a staff member": "trainerRequired",
  "That staff member is no longer active.": "staffInactive",
  "Please fix the highlighted fields.": "fixHighlighted",
  "Another member already uses this phone.": "duplicatePhone",
  "Another member already uses this email.": "duplicateEmail",
  "Can't reactivate — another active member now uses this phone or email. Edit the contact first.":
    "reactivateConflict",
  // payments — validation (validation.ts)
  "Enter an amount": "enterAmount",
  "That amount is too long": "amountTooLong",
  "Choose a payment method": "paymentMethodRequired",
  "Keep the note under 500 characters": "noteTooLong",
  "Keep the reason under 500 characters": "reasonTooLong",
  // gym / branch / profile — validation (validation.ts). The dynamic "Must be N characters
  // or fewer" max-length message is not mapped (interpolated) → English Tier-2 residual.
  "Gym name is required": "gymNameRequired",
  "Branch name is required": "branchNameRequired",
  "Display name is required": "displayNameRequired",
  "Enter a valid URL": "urlInvalid",
  "Enter a whole number of days": "daysWholeNumber",
  "Must be a whole number": "wholeNumber",
  "Must be 0 or more": "zeroOrMore",
  "Unknown currency code (ISO-4217)": "currencyUnknown",
  "Unknown time zone (IANA)": "timeZoneUnknown",
};

/** Returns a mapper: known English error → localized message; unknown → the English source. */
export function useFormError(): (message?: string | null) => string | undefined {
  const t = useTranslations("formErrors");
  return (message) => {
    if (!message) return undefined;
    const code = CODE[message];
    return code ? t(code) : message;
  };
}
