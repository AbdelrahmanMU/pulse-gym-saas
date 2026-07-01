import { MembershipStatus } from "@pulse/db";
import type { StatusTone } from "@/components/pulse/status-badge";

/**
 * Presentation helpers for reports (no business logic). Maps a derived membership status onto a
 * label + StatusBadge tone for the report tables — the same semantics as the app's
 * MembershipStatusBadge, expressed via the generic catalog StatusBadge (a report is a data table,
 * not the lifecycle surface). Server-rendered, so the `@pulse/db` enum import is safe.
 */
const STATUS_META: Record<MembershipStatus, { tone: StatusTone; label: string }> = {
  ACTIVE: { tone: "success", label: "Active" },
  SCHEDULED: { tone: "info", label: "Scheduled" },
  FROZEN: { tone: "warning", label: "Frozen" },
  EXPIRED: { tone: "neutral", label: "Expired" },
  CANCELLED: { tone: "neutral", label: "Cancelled" },
};

export function membershipStatusMeta(status: MembershipStatus): {
  tone: StatusTone;
  label: string;
} {
  return STATUS_META[status];
}
