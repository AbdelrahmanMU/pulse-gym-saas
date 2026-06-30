import { Archive, CircleCheck } from "lucide-react";
import { StatusBadge } from "@/components/pulse/status-badge";

/**
 * PlanStatusBadge — maps a plan's `isActive` lifecycle (PLN-2: active/sellable ⇄
 * inactive/retired) onto the canonical StatusBadge, labelled per the product's
 * "Active/Archived" terms. Status by icon + label + token, never colour alone (§3).
 */
export function PlanStatusBadge({ isActive, size }: { isActive: boolean; size?: "sm" | "md" }) {
  return isActive ? (
    <StatusBadge tone="success" label="Active" size={size} icon={<CircleCheck />} />
  ) : (
    <StatusBadge tone="neutral" label="Archived" size={size} icon={<Archive />} />
  );
}
