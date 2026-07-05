import type { PaymentMethodValue } from "./validation";

/**
 * Presentation helpers for Payments (no business logic — money math lives in `ledger.ts`, parse/
 * format in `lib/money`). Pure string formatting for the UI. Client-safe: keyed on the plain
 * method-value union (never the server-only `@pulse/db` enum), so it can be used in client forms.
 */

const METHOD_LABELS: Record<PaymentMethodValue, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CARD_MANUAL: "Card (manual)",
  OTHER: "Other",
};

// Payment-method words per the Localization Authority (D7): نقدًا · تحويل · بطاقة. Client-safe
// (no db enum); English preserved when `locale` is absent or non-Arabic.
const AR_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  CASH: "نقدًا",
  BANK_TRANSFER: "تحويل",
  CARD_MANUAL: "بطاقة",
  OTHER: "أخرى",
};

/** Human label for a payment method (controlled vocabulary → display text), locale-aware. */
export function paymentMethodLabel(method: PaymentMethodValue, locale?: string): string {
  if (locale?.toLowerCase().startsWith("ar")) return AR_METHOD_LABELS[method] ?? "—";
  return METHOD_LABELS[method] ?? "—";
}
