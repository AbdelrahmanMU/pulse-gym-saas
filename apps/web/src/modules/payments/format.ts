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

/** Human label for a payment method (controlled vocabulary → display text). */
export function paymentMethodLabel(method: PaymentMethodValue): string {
  return METHOD_LABELS[method] ?? "—";
}
