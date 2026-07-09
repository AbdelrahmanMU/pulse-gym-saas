import { getTranslations } from "next-intl/server";
import { MetricValue } from "@/components/pulse/metric-value";
import type { MembershipBilling } from "../service";
import { PaymentStandingBadge } from "./payment-standing-badge";

/**
 * Outstanding-balance panel — Price / Total Paid / Remaining, all **derived** from the immutable
 * ledger (never stored), plus the derived Payment Standing badge. Money renders via the catalogued
 * MetricValue (mono-tabular, exact minor units). A negative remaining means an overpayment and is
 * labelled as credit. Async server component (reads the active locale). Display-only; tokens only.
 */
export async function PaymentSummary({ billing }: { billing: MembershipBilling }) {
  const t = await getTranslations("payments");
  const overpaid = BigInt(billing.remainingMinor) < 0n;
  const remainingLabel = overpaid ? t("creditOverpaid") : t("remainingBalance");
  const remainingMinor = overpaid
    ? (-BigInt(billing.remainingMinor)).toString()
    : billing.remainingMinor;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-body-sm text-muted-foreground">{t("standing")}</span>
        <PaymentStandingBadge standing={billing.standing} />
      </div>
      <dl className="flex flex-col gap-3">
        <Line label={t("membershipPrice")}>
          <MetricValue value={billing.priceMinor} format="currency" currency={billing.currency} />
        </Line>
        <Line label={t("totalPaid")}>
          <MetricValue
            value={billing.totalPaidMinor}
            format="currency"
            currency={billing.currency}
          />
        </Line>
        <Line label={remainingLabel} emphasis>
          <MetricValue
            value={remainingMinor}
            format="currency"
            currency={billing.currency}
            size="lg"
          />
        </Line>
      </dl>
    </div>
  );
}

function Line({
  label,
  children,
  emphasis = false,
}: {
  label: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3 first:border-0 first:pt-0">
      <dt
        className={
          emphasis ? "text-body font-medium text-foreground" : "text-body-sm text-muted-foreground"
        }
      >
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
