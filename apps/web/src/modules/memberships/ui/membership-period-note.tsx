import type { ReactNode } from "react";
import { MembershipStatus } from "@pulse/db";
import { useLocale, useTranslations } from "next-intl";
import { Alert } from "@/components/pulse/alert";
import { formatDate } from "@/lib/format-date";

/**
 * Informational (non-authoritative) context for a membership's Period (Sprint-1 UX slice).
 * Explains two correct-but-non-obvious lifecycle states so operational staff don't read them as
 * broken: an in-progress freeze (the end date extends on *resume*, not now — FRZ-2/INV-18) and a
 * scheduled renewal (it activates when the current membership ends, not on its stored start — T-5).
 * Presentation only — it never changes, and never restates as authoritative, any stored/derived
 * business value. Catalog `Alert` (info → `role="status"`); tokens only.
 */
export function MembershipPeriodNote({
  status,
  isRenewal,
  activeFreeze,
}: {
  status: MembershipStatus;
  isRenewal: boolean;
  activeFreeze: { plannedDays: number; projectedEndDate: string } | null;
}) {
  const t = useTranslations("memberships");
  const locale = useLocale();
  if (status === MembershipStatus.FROZEN && activeFreeze) {
    return (
      <Alert severity="info" title={t("pnFreezeTitle")}>
        {t.rich("pnFreezeBody", {
          days: activeFreeze.plannedDays,
          n: String(activeFreeze.plannedDays),
          strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
          end: () => (
            <time dateTime={activeFreeze.projectedEndDate} className="tabular font-medium">
              {formatDate(activeFreeze.projectedEndDate, locale, "full")}
            </time>
          ),
        })}
      </Alert>
    );
  }
  if (status === MembershipStatus.SCHEDULED && isRenewal) {
    return (
      <Alert severity="info" title={t("pnScheduledTitle")}>
        {t("pnScheduledBody")}
      </Alert>
    );
  }
  return null;
}
