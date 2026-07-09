import { Ban, CalendarClock, CircleCheck, CircleOff, Snowflake, TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MembershipStatus } from "@pulse/db";
import { StatusBadge, type StatusTone } from "@/components/pulse/status-badge";

/**
 * MembershipStatusBadge (Catalog §StatusBadge derivative) — maps the derived `MembershipStatus`
 * onto the canonical StatusBadge. Status is conveyed by icon + label + token, never colour
 * alone (constitution §3). "Expiring soon" is an *indicator over Active* (MSH-4), not a status —
 * it renders as a separate warning pill, never replacing the Active badge. Async server component
 * so labels read from the active locale at the source (Localization Authority).
 */
const TONE: Record<MembershipStatus, StatusTone> = {
  ACTIVE: "success",
  SCHEDULED: "info",
  FROZEN: "warning",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
};

const LABEL_KEY: Record<MembershipStatus, string> = {
  ACTIVE: "membershipActive",
  SCHEDULED: "membershipScheduled",
  FROZEN: "membershipFrozen",
  EXPIRED: "membershipExpired",
  CANCELLED: "membershipCancelled",
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

export async function MembershipStatusBadge({
  status,
  isExpiringSoon = false,
  size,
}: {
  status: MembershipStatus;
  isExpiringSoon?: boolean;
  size?: "sm" | "md";
}) {
  const t = await getTranslations("status");
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusBadge
        tone={TONE[status]}
        label={t(LABEL_KEY[status])}
        size={size}
        icon={icon(status)}
      />
      {isExpiringSoon ? (
        <StatusBadge
          tone="warning"
          label={t("expiringSoon")}
          size={size}
          icon={<TriangleAlert />}
        />
      ) : null}
    </span>
  );
}
