import type { ReactNode } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { MembershipStatus } from "@pulse/db";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import { MetricValue } from "@/components/pulse/metric-value";
import { formatDate, toISODate } from "@/lib/format-date";
import type { MembershipRow } from "../service";
import { remainingDaysLabel } from "../format";
import { MembershipStatusBadge } from "./membership-status-badge";

/**
 * Memberships table — maps `MembershipRow`s onto the canonical DataTable (Catalog §DataTable).
 * The member name links to the membership; status via MembershipStatusBadge; dates as `<time>`;
 * price via MetricValue (mono-tabular, server-formatted snapshot money). Async server component so
 * columns/labels read from the active locale (Localization Authority).
 */
export async function MembershipsTable({
  rows,
  empty,
}: {
  rows: MembershipRow[];
  empty?: ReactNode;
}) {
  const t = await getTranslations("memberships");
  const locale = await getLocale();

  const columns: DataTableColumn<MembershipRow>[] = [
    {
      key: "member",
      header: t("colMember"),
      render: (m) => (
        <Link href={`/memberships/${m.id}`} className="font-medium text-foreground hover:underline">
          {m.memberName}
        </Link>
      ),
    },
    { key: "plan", header: t("colPlan"), priority: 2, render: (m) => m.planName },
    {
      key: "status",
      header: t("colStatus"),
      render: (m) => (
        <MembershipStatusBadge status={m.status} isExpiringSoon={m.isExpiringSoon} size="sm" />
      ),
    },
    {
      key: "end",
      header: t("colEnds"),
      priority: 2,
      render: (m) => (
        <div className="flex flex-col">
          <time dateTime={toISODate(m.effectiveEndDate)} className="tabular">
            {formatDate(m.effectiveEndDate, locale, "iso")}
          </time>
          {m.status === MembershipStatus.FROZEN ? (
            // The stored end holds while frozen; it extends on resume (FRZ-2). Flag it so the
            // un-moved date next to a Frozen badge doesn't read as "the freeze did nothing".
            <span className="text-caption text-muted-foreground">{t("extendsOnResume")}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "price",
      header: t("colPrice"),
      numeric: true,
      render: (m) => <MetricValue value={m.priceMinor} format="currency" currency={m.currency} />,
    },
  ];

  /**
   * AP-1 mobile card — operational-first order (v1.2 §6 / adaptive-design-report §5):
   * P0 status · remaining days → P1 member (link) · plan · ends → P2 price snapshot.
   */
  const card = (m: MembershipRow) => {
    const remaining = remainingDaysLabel(m.status, m.remainingDays);
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <MembershipStatusBadge status={m.status} isExpiringSoon={m.isExpiringSoon} size="sm" />
          <span className="text-body-sm text-muted-foreground">
            {t(remaining.key, remaining.values)}
          </span>
        </div>
        <Link
          href={`/memberships/${m.id}`}
          className="font-medium text-body-lg text-foreground hover:underline"
        >
          {m.memberName}
        </Link>
        <div className="flex items-baseline justify-between gap-3 text-body-sm">
          <span className="text-foreground">{m.planName}</span>
          <span className="text-muted-foreground">
            {t("endsPrefix")}{" "}
            <time dateTime={toISODate(m.effectiveEndDate)} className="tabular">
              {formatDate(m.effectiveEndDate, locale, "iso")}
            </time>
            {m.status === MembershipStatus.FROZEN ? ` ${t("extendsOnResumeInline")}` : null}
          </span>
        </div>
        <MetricValue value={m.priceMinor} format="currency" currency={m.currency} size="sm" />
      </div>
    );
  };

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(m) => m.id}
      caption={t("caption")}
      empty={empty}
      renderCard={card}
    />
  );
}
