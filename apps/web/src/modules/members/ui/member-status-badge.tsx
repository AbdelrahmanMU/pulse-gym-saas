import { Archive, CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/pulse/status-badge";

/**
 * MemberStatusBadge (Catalog §StatusBadge derivative) — maps the `MemberStatus` vocabulary
 * onto the canonical StatusBadge. Status is conveyed by icon + label + token, never colour
 * alone (constitution §3). ACTIVE = success; ARCHIVED = neutral (an archived member is not
 * an error state — they are retained history, ARC-1/2).
 */
export async function MemberStatusBadge({
  status,
  size,
  withNoun = false,
}: {
  status: "ACTIVE" | "ARCHIVED";
  size?: "sm" | "md";
  /** Adds the noun ("Active member") where the surface names people, not statuses (§D14). */
  withNoun?: boolean;
}) {
  const t = await getTranslations("status");
  return status === "ACTIVE" ? (
    <StatusBadge
      tone="success"
      label={t(withNoun ? "memberActiveNoun" : "memberActive")}
      size={size}
      icon={<CircleCheck />}
    />
  ) : (
    <StatusBadge
      tone="neutral"
      label={t(withNoun ? "memberArchivedNoun" : "memberArchived")}
      size={size}
      icon={<Archive />}
    />
  );
}
