import { PaymentEntryType } from "@pulse/db";
import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { formatDate, toISODate } from "@/lib/format-date";
import { MetricValue } from "@/components/pulse/metric-value";
import { EmptyState } from "@/components/pulse/empty-state";
import type { PaymentHistoryEntry } from "../service";
import { paymentMethodLabel } from "../format";
import { VoidPaymentControl } from "./void-payment-control";

/**
 * Payment history — the chronological (append-order) ledger for a membership: date, amount, method,
 * recorder, note, and a **running total**. Voided payments render struck + marked; a VOID entry
 * renders as a reversal. Per-row void controls appear only when the caller passes `canVoid` (the
 * page resolves `payments.void`). Async server component (locale-aware). Display-only; tokens only.
 */
export async function PaymentHistory({
  membershipId,
  entries,
  canVoid,
}: {
  membershipId: string;
  entries: PaymentHistoryEntry[];
  canVoid: boolean;
}) {
  const t = await getTranslations("payments");
  const locale = await getLocale();
  if (entries.length === 0) {
    return <EmptyState title={t("historyEmptyTitle")} description={t("historyEmptyBody")} />;
  }

  return (
    <ol className="flex flex-col divide-y divide-border">
      {entries.map((entry) => {
        const isVoidEntry = entry.entryType === PaymentEntryType.VOID;
        // Sign the magnitude: a PAYMENT adds, a VOID reverses.
        const displayMinor = isVoidEntry ? `-${entry.amountMinor}` : entry.amountMinor;
        return (
          <li key={entry.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2 text-body text-foreground">
                  <span
                    className={cn(
                      "font-medium",
                      entry.isVoided && "text-muted-foreground line-through",
                    )}
                  >
                    {isVoidEntry ? t("voidEntry") : paymentMethodLabel(entry.method, locale)}
                  </span>
                  {entry.isVoided ? (
                    <span className="text-eyebrow font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("voidedBadge")}
                    </span>
                  ) : null}
                </span>
                <time
                  dateTime={toISODate(entry.receivedAt)}
                  className="tabular text-body-sm text-muted-foreground"
                >
                  {formatDate(entry.receivedAt, locale, "iso")} ·{" "}
                  <span dir="auto">{entry.recordedByName}</span>
                </time>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <MetricValue
                  value={displayMinor}
                  format="currency"
                  currency={entry.currency}
                  className={cn(entry.isVoided && "text-muted-foreground line-through")}
                />
                <span className="text-body-sm text-muted-foreground">
                  {t("balancePaid")}{" "}
                  <MetricValue
                    value={entry.runningTotalMinor}
                    format="currency"
                    currency={entry.currency}
                    size="sm"
                  />
                </span>
              </div>
            </div>

            {entry.note ? <p className="text-body-sm text-muted-foreground">{entry.note}</p> : null}
            {isVoidEntry && entry.voidReason ? (
              <p className="text-body-sm text-muted-foreground">
                {t("reasonPrefix")} <span dir="auto">{entry.voidReason}</span>
              </p>
            ) : null}

            {canVoid && entry.isVoidable ? (
              <div className="mt-1">
                <VoidPaymentControl membershipId={membershipId} paymentId={entry.id} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
