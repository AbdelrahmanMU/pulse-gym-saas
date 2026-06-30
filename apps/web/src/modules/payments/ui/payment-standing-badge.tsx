import { CircleCheck, CircleDashed, CircleDollarSign } from "lucide-react";
import { PaymentStanding } from "@pulse/db";
import { StatusBadge, type StatusTone } from "@/components/pulse/status-badge";

/**
 * PaymentStandingBadge (Catalog §StatusBadge derivative) — maps the **derived** `PaymentStanding`
 * onto the canonical StatusBadge. Standing is conveyed by icon + label + token, never colour alone
 * (constitution §3). Standing is informational; it never reflects or changes Membership Status.
 * Server component (no client bundle of the server-only db enum).
 */
const TONE: Record<PaymentStanding, StatusTone> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  PENDING: "neutral",
};

const LABEL: Record<PaymentStanding, string> = {
  PAID: "Paid",
  PARTIALLY_PAID: "Partially paid",
  PENDING: "Pending",
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

export function PaymentStandingBadge({
  standing,
  size,
}: {
  standing: PaymentStanding;
  size?: "sm" | "md";
}) {
  return (
    <StatusBadge tone={TONE[standing]} label={LABEL[standing]} size={size} icon={icon(standing)} />
  );
}
