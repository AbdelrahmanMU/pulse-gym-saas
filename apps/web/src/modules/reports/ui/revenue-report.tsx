import { CalendarRange, TrendingUp, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
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
 * Money via MetricValue (StatCard); async server component so labels read the active locale.
 */
export async function RevenueReportView({ report }: { report: RevenueReport }) {
  const t = await getTranslations("reports");
  return (
    <div className="flex flex-col gap-6">
      <KPIGrid>
        <StatCard
          label={t("today")}
          value={report.todayMinor}
          format="currency"
          currency={report.currency}
          icon={<Wallet />}
        />
        <StatCard
          label={t("thisWeek")}
          value={report.weekMinor}
          format="currency"
          currency={report.currency}
          icon={<TrendingUp />}
          hint={t("thisWeekHint")}
        />
        <StatCard
          label={t("thisMonth")}
          value={report.monthMinor}
          format="currency"
          currency={report.currency}
          icon={<TrendingUp />}
          hint={t("thisMonthHint")}
        />
        {report.custom ? (
          <StatCard
            label={t("customRange")}
            value={report.custom.totalMinor}
            format="currency"
            currency={report.currency}
            icon={<CalendarRange />}
            hint={`${report.custom.fromIso} – ${report.custom.toIso}`}
          />
        ) : null}
      </KPIGrid>

      <section className="rounded-md border border-border bg-surface p-6">
        <h2 className="mb-4 text-h3 text-foreground">{t("customRangeSection")}</h2>
        <form method="get" className="flex flex-wrap items-end gap-4">
          <FormField label={t("fromLabel")} className="w-48">
            <TextInput type="date" name="from" defaultValue={report.custom?.fromIso} required />
          </FormField>
          <FormField label={t("toLabel")} className="w-48">
            <TextInput type="date" name="to" defaultValue={report.custom?.toIso} required />
          </FormField>
          <Button type="submit" variant="secondary">
            {t("applyRange")}
          </Button>
        </form>
      </section>
    </div>
  );
}
