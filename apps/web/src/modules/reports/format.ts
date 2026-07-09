import { MembershipStatus } from "@pulse/db";
import type { StatusTone } from "@/components/pulse/status-badge";

/**
 * Presentation helpers for reports (no business logic). Maps a derived membership status onto a
 * StatusBadge tone + the `status`-namespace label key for the report tables — the same semantics as
 * the app's MembershipStatusBadge, expressed via the generic catalog StatusBadge (a report is a data
 * table, not the lifecycle surface). The caller resolves the label with its translator.
 */
const STATUS_META: Record<MembershipStatus, { tone: StatusTone; labelKey: string }> = {
  ACTIVE: { tone: "success", labelKey: "membershipActive" },
  SCHEDULED: { tone: "info", labelKey: "membershipScheduled" },
  FROZEN: { tone: "warning", labelKey: "membershipFrozen" },
  EXPIRED: { tone: "neutral", labelKey: "membershipExpired" },
  CANCELLED: { tone: "neutral", labelKey: "membershipCancelled" },
};

export function membershipStatusMeta(status: MembershipStatus): {
  tone: StatusTone;
  labelKey: string;
} {
  return STATUS_META[status];
}
