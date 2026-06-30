import { PaymentEntryType } from "@pulse/db";
import { cn } from "@/lib/utils";
import { MetricValue } from "@/components/pulse/metric-value";
import { EmptyState } from "@/components/pulse/empty-state";
import type { PaymentHistoryEntry } from "../service";
import { paymentMethodLabel } from "../format";
import { VoidPaymentControl } from "./void-payment-control";

/**
 * Payment history — the chronological (append-order) ledger for a membership: date, amount, method,
 * recorder, note, and a **running total**. Voided payments render struck + marked; a VOID entry
 * renders as a reversal. Per-row void controls appear only when the caller passes `canVoid` (the
 * page resolves `payments.void`). Display-only; tokens only.
 */
const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export function PaymentHistory({
  membershipId,
  entries,
  canVoid,
}: {
  membershipId: string;
  entries: PaymentHistoryEntry[];
  canVoid: boolean;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No payments yet"
        description="Record the first payment to start tracking this membership’s balance."
      />
    );
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
                    {isVoidEntry ? "Void" : paymentMethodLabel(entry.method)}
                  </span>
                  {entry.isVoided ? (
                    <span className="text-eyebrow font-semibold uppercase tracking-wide text-muted-foreground">
                      Voided
                    </span>
                  ) : null}
                </span>
                <time
                  dateTime={isoDate(entry.receivedAt)}
                  className="tabular text-body-sm text-muted-foreground"
                >
                  {isoDate(entry.receivedAt)} · {entry.recordedByName}
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
                  Balance paid:{" "}
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
              <p className="text-body-sm text-muted-foreground">Reason: {entry.voidReason}</p>
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
