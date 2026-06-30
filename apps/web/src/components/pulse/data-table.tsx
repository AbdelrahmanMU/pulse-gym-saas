import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PULSE DataTable (Catalog §DataTable) — the **only** table in the system; never build a
 * bespoke table (constitution §3). This is the minimal canonical surface: typed columns,
 * a semantic `<table>` with `scope`d headers, right-aligned tabular-mono numeric/date
 * columns, an empty slot, and a responsive priority system (lower-priority columns drop on
 * narrow screens; the table scrolls horizontally as the backstop). Selection, bulk-bar,
 * density toggle, and in-header sort are deliberately omitted until a story needs them
 * (no speculative architecture). Tokens only; presentation only (no client state).
 */
export interface DataTableColumn<Row> {
  /** Stable column id (used as the React key). */
  key: string;
  header: ReactNode;
  /** Cell renderer — receives the row, returns catalogued content. */
  render: (row: Row) => ReactNode;
  /** Right-align + tabular-mono for money/dates/counts (Design System signature). */
  numeric?: boolean;
  /** Responsive priority: 1 always shown; 2 hidden under `sm`; 3 hidden under `md`. */
  priority?: 1 | 2 | 3;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Shown in place of the table when there are no rows (EmptyState / NoResultsState). */
  empty?: ReactNode;
  /** Accessible table description (rendered sr-only). */
  caption?: string;
  className?: string;
}

const PRIORITY: Record<NonNullable<DataTableColumn<unknown>["priority"]>, string> = {
  1: "",
  2: "hidden sm:table-cell",
  3: "hidden md:table-cell",
};

function priorityClass(priority?: DataTableColumn<unknown>["priority"]): string {
  return priority ? PRIORITY[priority] : "";
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
  caption,
  className,
}: DataTableProps<Row>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className={cn("w-full overflow-x-auto rounded-md border border-border", className)}>
      <table className="w-full border-collapse text-body">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-border bg-surface-raised">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "px-4 py-3 text-body-sm font-medium text-muted-foreground",
                  col.numeric ? "text-right" : "text-left",
                  priorityClass(col.priority),
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-border last:border-0 hover:bg-surface-raised focus-within:bg-surface-raised"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3 align-middle text-foreground",
                    col.numeric && "text-right tabular",
                    priorityClass(col.priority),
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
