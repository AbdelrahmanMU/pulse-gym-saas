import { Ban, CalendarClock, CircleCheck, CircleOff, Snowflake, TriangleAlert } from "lucide-react";
import { MembershipStatus } from "@pulse/db";
import { StatusBadge, type StatusTone } from "@/components/pulse/status-badge";

/**
 * MembershipStatusBadge (Catalog §StatusBadge derivative) — maps the derived `MembershipStatus`
 * onto the canonical StatusBadge. Status is conveyed by icon + label + token, never colour
 * alone (constitution §3). "Expiring soon" is an *indicator over Active* (MSH-4), not a status —
 * it renders as a separate warning pill, never replacing the Active badge.
 */
const TONE: Record<MembershipStatus, StatusTone> = {
  ACTIVE: "success",
  SCHEDULED: "info",
  FROZEN: "warning",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
};

const LABEL: Record<MembershipStatus, string> = {
  ACTIVE: "Active",
  SCHEDULED: "Scheduled",
  FROZEN: "Frozen",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

function icon(status: MembershipStatus) {
  switch (status) {
    case MembershipStatus.ACTIVE:
      return <CircleCheck />;
    case MembershipStatus.SCHEDULED:
      return <CalendarClock />;
    case MembershipStatus.FROZEN:
      return <Snowflake />;
    case MembershipStatus.CANCELLED:
      return <Ban />;
    default:
      return <CircleOff />;
  }
}

export function MembershipStatusBadge({
  status,
  isExpiringSoon = false,
  size,
}: {
  status: MembershipStatus;
  isExpiringSoon?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusBadge tone={TONE[status]} label={LABEL[status]} size={size} icon={icon(status)} />
      {isExpiringSoon ? (
        <StatusBadge tone="warning" label="Expiring soon" size={size} icon={<TriangleAlert />} />
      ) : null}
    </span>
  );
}
