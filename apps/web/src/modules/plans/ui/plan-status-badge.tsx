import { Archive, CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/pulse/status-badge";

/**
 * PlanStatusBadge — maps a plan's `isActive` lifecycle (PLN-2: active/sellable ⇄
 * inactive/retired) onto the canonical StatusBadge. Status by icon + label + token, never colour
 * alone (§3). Async server component so labels read the active locale (متاحة/موقوفة, Authority).
 */
export async function PlanStatusBadge({
  isActive,
  size,
}: {
  isActive: boolean;
  size?: "sm" | "md";
}) {
  const t = await getTranslations("status");
  return isActive ? (
    <StatusBadge tone="success" label={t("planAvailable")} size={size} icon={<CircleCheck />} />
  ) : (
    <StatusBadge tone="neutral" label={t("planRetired")} size={size} icon={<Archive />} />
  );
}
