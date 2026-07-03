import { Archive, CircleCheck } from "lucide-react";
import { StatusBadge } from "@/components/pulse/status-badge";

/**
 * MemberStatusBadge (Catalog §StatusBadge derivative) — maps the `MemberStatus` vocabulary
 * onto the canonical StatusBadge. Status is conveyed by icon + label + token, never colour
 * alone (constitution §3). ACTIVE = success; ARCHIVED = neutral (an archived member is not
 * an error state — they are retained history, ARC-1/2).
 */
export function MemberStatusBadge({
  status,
  size,
  withNoun = false,
}: {
  status: "ACTIVE" | "ARCHIVED";
  size?: "sm" | "md";
  /** Adds the noun ("Active member") where the surface names people, not statuses (§D14). */
  withNoun?: boolean;
}) {
  return status === "ACTIVE" ? (
    <StatusBadge
      tone="success"
      label={withNoun ? "Active member" : "Active"}
      size={size}
      icon={<CircleCheck />}
    />
  ) : (
    <StatusBadge
      tone="neutral"
      label={withNoun ? "Archived member" : "Archived"}
      size={size}
      icon={<Archive />}
    />
  );
}
