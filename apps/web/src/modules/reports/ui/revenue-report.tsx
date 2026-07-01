import { CalendarRange, TrendingUp, Wallet } from "lucide-react";
import { KPIGrid } from "@/components/pulse/kpi-grid";
import { StatCard } from "@/components/pulse/stat-card";
import { FormField } from "@/components/pulse/form-field";
import { TextInput } from "@/components/pulse/text-input";
import { Button } from "@/components/pulse/button";
import type { RevenueReport } from "@/modules/payments";

/**
 * Revenue report (Epic-8) — Today / This Week / This Month period-to-date StatCards, plus a custom
 * date-range filter (a plain `GET` form, so it is shareable and needs no client state) that adds a
 * fourth card. All values are net revenue derived in the payment ledger; this view does zero math.
 * Money via MetricValue (StatCard); server-rendered.
 */
export function RevenueReportView({ report }: { report: RevenueReport }) {
  return (
    <div className="flex flex-col gap-6">
      <KPIGrid>
        <StatCard
          label="Today"
          value={report.todayMinor}
          format="currency"
          currency={report.currency}
          icon={<Wallet />}
        />
        <StatCard
          label="This Week"
          value={report.weekMinor}
          format="currency"
          currency={report.currency}
          icon={<TrendingUp />}
          hint="Monday to today"
        />
        <StatCard
          label="This Month"
          value={report.monthMinor}
          format="currency"
          currency={report.currency}
          icon={<TrendingUp />}
          hint="1st to today"
        />
        {report.custom ? (
          <StatCard
            label="Custom range"
            value={report.custom.totalMinor}
            format="currency"
            currency={report.currency}
            icon={<CalendarRange />}
            hint={`${report.custom.fromIso} – ${report.custom.toIso}`}
          />
        ) : null}
      </KPIGrid>

      <section className="rounded-md border border-border bg-surface p-6">
        <h2 className="mb-4 text-h3 text-foreground">Custom date range</h2>
        <form method="get" className="flex flex-wrap items-end gap-4">
          <FormField label="From" className="w-48">
            <TextInput type="date" name="from" defaultValue={report.custom?.fromIso} required />
          </FormField>
          <FormField label="To" className="w-48">
            <TextInput type="date" name="to" defaultValue={report.custom?.toIso} required />
          </FormField>
          <Button type="submit" variant="secondary">
            Apply range
          </Button>
        </form>
      </section>
    </div>
  );
}
