import Link from "next/link";
import { CalendarClock, CircleDollarSign, ClipboardList, Wallet } from "lucide-react";
import { PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ReportForbidden } from "@/modules/reports/ui/report-forbidden";

/**
 * Reports hub (Sprint-1 Epic-8). Gated by `reports.view` (inline Forbidden on deny). Links to the four
 * operational reports; each report page composes its data from the existing read models. Routing only.
 */
const REPORTS = [
  {
    href: "/reports/revenue",
    label: "Revenue",
    description: "Today, this week, this month, and a custom date range.",
    icon: <Wallet aria-hidden />,
  },
  {
    href: "/reports/memberships",
    label: "Memberships",
    description: "Counts by status with filtering.",
    icon: <ClipboardList aria-hidden />,
  },
  {
    href: "/reports/outstanding",
    label: "Outstanding balances",
    description: "Member, membership, price, paid, and balance due.",
    icon: <CircleDollarSign aria-hidden />,
  },
  {
    href: "/reports/expiring",
    label: "Expiring memberships",
    description: "Within 7 days, within 30 days, and already expired.",
    icon: <CalendarClock aria-hidden />,
  },
];

export default async function ReportsPage() {
  try {
    await requirePermission(PERMISSION_KEYS.REPORTS_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return <ReportForbidden />;
    throw error;
  }

  return (
    <PageContainer>
      <PageHeader title="Reports" subtitle="Operational reports over your gym’s live data." />
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="flex flex-col gap-2 rounded-md border border-border bg-surface p-6 transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised"
          >
            <span className="flex items-center gap-2 text-h3 text-foreground">
              <span aria-hidden className="text-muted-foreground [&_svg]:size-5">
                {r.icon}
              </span>
              {r.label}
            </span>
            <span className="text-body-sm text-muted-foreground">{r.description}</span>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
