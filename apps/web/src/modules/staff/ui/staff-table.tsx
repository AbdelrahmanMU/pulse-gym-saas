import type { ReactNode } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import type { StaffRow } from "../service";
import { StaffStatusBadge } from "./staff-status-badge";

/**
 * Staff table — maps `StaffRow`s onto the canonical DataTable (Catalog §DataTable). The name links
 * to the staff detail page (accessible row navigation without bespoke JS); status uses the
 * StaffStatusBadge (icon + label + token); Last login uses `<time>` with tabular-mono, or "Never".
 * Server component — presentation only.
 */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const columns: DataTableColumn<StaffRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (s) => (
      <Link href={`/staff/${s.id}`} className="font-medium text-foreground hover:underline">
        {s.displayName}
      </Link>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (s) => <span>{s.roleName}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (s) => <StaffStatusBadge status={s.status} size="sm" />,
  },
  {
    key: "email",
    header: "Email",
    priority: 2,
    render: (s) => <span className="text-body-sm text-muted-foreground">{s.email}</span>,
  },
  {
    key: "lastLogin",
    header: "Last login",
    priority: 3,
    numeric: true,
    render: (s) =>
      s.lastLoginAt ? (
        <time dateTime={s.lastLoginAt.toISOString()}>{isoDate(s.lastLoginAt)}</time>
      ) : (
        <span className="text-muted-foreground">Never</span>
      ),
  },
];

export function StaffTable({ rows, empty }: { rows: StaffRow[]; empty?: ReactNode }) {
  return (
    <DataTable columns={columns} rows={rows} rowKey={(s) => s.id} caption="Staff" empty={empty} />
  );
}
