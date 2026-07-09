import { Ban, CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/pulse/status-badge";
import type { StaffStatus } from "../service";

/**
 * StaffStatusBadge (Catalog §StatusBadge derivative) — maps the staff lifecycle onto the canonical
 * StatusBadge. Status is conveyed by icon + label + token, never colour alone (constitution §3).
 * The schema status is `ACTIVE` / `REVOKED`; the display label for `REVOKED` is **"Suspended"**
 * (نشط/موقوف, Authority). Async server component so labels read the active locale.
 */
export async function StaffStatusBadge({
  status,
  size,
}: {
  status: StaffStatus;
  size?: "sm" | "md";
}) {
  const t = await getTranslations("status");
  return status === "ACTIVE" ? (
    <StatusBadge tone="success" label={t("staffActive")} size={size} icon={<CircleCheck />} />
  ) : (
    <StatusBadge tone="warning" label={t("staffRevoked")} size={size} icon={<Ban />} />
  );
}
