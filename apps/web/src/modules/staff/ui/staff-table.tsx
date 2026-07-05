import type { ReactNode } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import { formatDate, toISODate } from "@/lib/format-date";
import type { StaffRow } from "../service";
import { StaffStatusBadge } from "./staff-status-badge";

/**
 * Staff table — maps `StaffRow`s onto the canonical DataTable (Catalog §DataTable). The name links
 * to the staff detail page; status uses the StaffStatusBadge (icon + label + token); Last login uses
 * `<time>` with tabular-mono, or "Never". Async server component so headers/dates read the locale.
 */
export async function StaffTable({ rows, empty }: { rows: StaffRow[]; empty?: ReactNode }) {
  const t = await getTranslations("staff");
  const locale = await getLocale();

  const columns: DataTableColumn<StaffRow>[] = [
    {
      key: "name",
      header: t("colName"),
      render: (s) => (
        <Link href={`/staff/${s.id}`} className="font-medium text-foreground hover:underline">
          {s.displayName}
        </Link>
      ),
    },
    {
      key: "role",
      header: t("colRole"),
      render: (s) => <span>{s.roleName}</span>,
    },
    {
      key: "status",
      header: t("colStatus"),
      render: (s) => <StaffStatusBadge status={s.status} size="sm" />,
    },
    {
      key: "email",
      header: t("colEmail"),
      priority: 2,
      render: (s) => (
        <span dir="ltr" className="text-body-sm text-muted-foreground">
          {s.email}
        </span>
      ),
    },
    {
      key: "lastLogin",
      header: t("colLastLogin"),
      priority: 3,
      numeric: true,
      render: (s) =>
        s.lastLoginAt ? (
          <time dateTime={toISODate(s.lastLoginAt)}>
            {formatDate(s.lastLoginAt, locale, "iso")}
          </time>
        ) : (
          <span className="text-muted-foreground">{t("lastLoginNever")}</span>
        ),
    },
  ];

  /**
   * AP-1 mobile card — operational-first order (v1.2 §6 / adaptive-design-report §9):
   * P0 Active/Revoked status · role → P1 name (link) → P2 email · last login.
   */
  const renderCard = (s: StaffRow): ReactNode => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <StaffStatusBadge status={s.status} size="sm" />
        <span className="text-body-sm text-foreground">{s.roleName}</span>
      </div>
      <Link
        href={`/staff/${s.id}`}
        className="font-medium text-body-lg text-foreground hover:underline"
      >
        {s.displayName}
      </Link>
      <div className="flex flex-col text-body-sm text-muted-foreground">
        <span dir="ltr" className="text-start">
          {s.email}
        </span>
        <span>
          {t("cardLastLogin")}{" "}
          {s.lastLoginAt ? (
            <time dateTime={toISODate(s.lastLoginAt)} className="tabular">
              {formatDate(s.lastLoginAt, locale, "iso")}
            </time>
          ) : (
            t("lastLoginNever")
          )}
        </span>
      </div>
    </div>
  );

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(s) => s.id}
      caption={t("caption")}
      empty={empty}
      renderCard={renderCard}
    />
  );
}
