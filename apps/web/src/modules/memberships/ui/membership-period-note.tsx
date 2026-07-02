import { MembershipStatus } from "@pulse/db";
import { Alert } from "@/components/pulse/alert";

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
  if (status === MembershipStatus.FROZEN && activeFreeze) {
    return (
      <Alert severity="info" title="Freeze in progress">
        This membership is paused and won’t expire while frozen. The{" "}
        <strong>end date above stays in effect</strong> until you resume it — on resume it extends
        by the days it stays paused. Freeze requested: {activeFreeze.plannedDays} days → about{" "}
        <time dateTime={activeFreeze.projectedEndDate} className="tabular font-medium">
          {activeFreeze.projectedEndDate}
        </time>{" "}
        if resumed as planned. That projected date is an estimate, not the saved end date.
      </Alert>
    );
  }
  if (status === MembershipStatus.SCHEDULED && isRenewal) {
    return (
      <Alert severity="info" title="Scheduled renewal">
        This membership activates when the current membership ends — not on the start date shown
        above. It stays scheduled until then, even if that date has already passed.
      </Alert>
    );
  }
  return null;
}
