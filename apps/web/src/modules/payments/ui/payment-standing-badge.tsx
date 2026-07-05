import { CircleCheck, CircleDashed, CircleDollarSign } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PaymentStanding } from "@pulse/db";
import { StatusBadge, type StatusTone } from "@/components/pulse/status-badge";

/**
 * PaymentStandingBadge (Catalog §StatusBadge derivative) — maps the **derived** `PaymentStanding`
 * onto the canonical StatusBadge. Standing is conveyed by icon + label + token, never colour alone
 * (constitution §3). Standing is informational; it never reflects or changes Membership Status.
 * Async server component so labels read from the active locale (Localization Authority D7).
 */
const TONE: Record<PaymentStanding, StatusTone> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  PENDING: "neutral",
};

// D14 frozen vocabulary (مدفوع / مدفوع جزئيًا / غير مدفوع, Authority D7) — labels only, keyed to the
// shared `status` namespace; the PaymentStanding enum is untouched.
const LABEL_KEY: Record<PaymentStanding, string> = {
  PAID: "standingPaid",
  PARTIALLY_PAID: "standingPartlyPaid",
  PENDING: "standingUnpaid",
};

function icon(standing: PaymentStanding) {
  switch (standing) {
    case PaymentStanding.PAID:
      return <CircleCheck />;
    case PaymentStanding.PARTIALLY_PAID:
      return <CircleDollarSign />;
    default:
      return <CircleDashed />;
  }
}

export async function PaymentStandingBadge({
  standing,
  size,
}: {
  standing: PaymentStanding;
  size?: "sm" | "md";
}) {
  const t = await getTranslations("status");
  return (
    <StatusBadge
      tone={TONE[standing]}
      label={t(LABEL_KEY[standing])}
      size={size}
      icon={icon(standing)}
    />
  );
}
