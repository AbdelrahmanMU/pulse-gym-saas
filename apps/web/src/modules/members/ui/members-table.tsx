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

/**
 * AP-1 mobile card — operational-first order (v1.2 §6 / adaptive-design-report §2):
 * P0 member status → P1 name (link) · trainer → P2 contact · joined.
 */
function MemberCard(m: MemberRow) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <MemberStatusBadge status={m.status} size="sm" />
        {m.joinedOn ? (
          <time
            dateTime={isoDate(m.joinedOn)}
            className="tabular text-body-sm text-muted-foreground"
          >
            {isoDate(m.joinedOn)}
          </time>
        ) : null}
      </div>
      <Link
        href={`/members/${m.id}`}
        className="font-medium text-body-lg text-foreground hover:underline"
      >
        {m.fullName}
      </Link>
      {m.trainerName ? (
        <span className="text-body-sm text-muted-foreground">
          Trainer: <span className="text-foreground">{m.trainerName}</span>
        </span>
      ) : null}
      {m.phone || m.email ? (
        <div className="flex flex-col text-body-sm text-muted-foreground">
          {m.phone ? <span>{m.phone}</span> : null}
          {m.email ? <span>{m.email}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function MembersTable({ rows, empty }: { rows: MemberRow[]; empty?: ReactNode }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(m) => m.id}
      caption="Members"
      empty={empty}
      renderCard={MemberCard}
    />
  );
}
