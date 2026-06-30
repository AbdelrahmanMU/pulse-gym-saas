import type { ReactNode } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/pulse/data-table";
import type { MemberRow } from "../service";
import { MemberStatusBadge } from "./member-status-badge";

/**
 * Members table — maps `MemberRow`s onto the canonical DataTable (Catalog §DataTable). The
 * name links to the member's profile (accessible row navigation without bespoke JS). Dates
 * use `<time>` with tabular-mono; status uses the MemberStatusBadge (icon + label + token).
 * Server component — presentation only.
 */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const columns: DataTableColumn<MemberRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (m) => (
      <Link href={`/members/${m.id}`} className="font-medium text-foreground hover:underline">
        {m.fullName}
      </Link>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (m) => <MemberStatusBadge status={m.status} size="sm" />,
  },
  {
    key: "contact",
    header: "Contact",
    priority: 2,
    render: (m) => (
      <div className="flex flex-col text-body-sm">
        {m.phone ? <span>{m.phone}</span> : null}
        {m.email ? <span className="text-muted-foreground">{m.email}</span> : null}
      </div>
    ),
  },
  {
    key: "trainer",
    header: "Trainer",
    priority: 3,
    render: (m) =>
      m.trainerName ? (
        <span>{m.trainerName}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "joined",
    header: "Joined",
    priority: 3,
    numeric: true,
    render: (m) =>
      m.joinedOn ? (
        <time dateTime={isoDate(m.joinedOn)}>{isoDate(m.joinedOn)}</time>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function MembersTable({ rows, empty }: { rows: MemberRow[]; empty?: ReactNode }) {
  return (
    <DataTable columns={columns} rows={rows} rowKey={(m) => m.id} caption="Members" empty={empty} />
  );
}
