import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PULSE DataTable (Catalog §DataTable + §12.4) — the **only** table in the system; never
 * build a bespoke table (constitution §3). This is the minimal canonical surface: typed
 * columns, a semantic `<table>` with `scope`d headers, right-aligned tabular-mono
 * numeric/date columns, an empty slot, and a responsive priority system (lower-priority
 * columns drop on narrow screens; the table scrolls horizontally as the backstop).
 * Selection, bulk-bar, density toggle, and in-header sort are deliberately omitted until
 * a story needs them (no speculative architecture). Tokens only; presentation only.
 *
 * v1.2 adaptive card mode (AP-1, opt-in & backward-compatible): pass `renderCard` (a
 * tailored operational-first card) or `cardMode` (a card derived from the visible columns
 * as label/value pairs) and below `md` each row renders as a stacked card instead of the
 * horizontal-scroll table. One data path — the same `columns[]`/`rows[]` drive both forms;
 * the card list is a labeled `<ul>` keeping the caption as its accessible name. Tables
 * that opt out keep today's behavior untouched.
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
  /** Accessible table description (rendered sr-only; names the card list in card mode). */
  caption?: string;
  /** v1.2 AP-1: tailored mobile card for a row (operational-first field order, §6). */
  renderCard?: (row: Row) => ReactNode;
  /** v1.2 AP-1: derive the mobile card from the visible columns (label/value pairs). */
  cardMode?: boolean;
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

/** Default AP-1 card: every column as a label/value pair, in column (priority) order. */
function DerivedCard<Row>({ columns, row }: { columns: DataTableColumn<Row>[]; row: Row }) {
  return (
    <div className="flex flex-col gap-2">
      {columns.map((col) => (
        <div key={col.key} className="flex items-baseline justify-between gap-4">
          <span className="shrink-0 text-body-sm text-muted-foreground">{col.header}</span>
          <span className={cn("text-body text-foreground", col.numeric && "tabular text-end")}>
            {col.render(row)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
  caption,
  renderCard,
  cardMode,
  className,
}: DataTableProps<Row>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  const adaptive = cardMode || renderCard !== undefined;

  return (
    <>
      {adaptive ? (
        <ul aria-label={caption} className={cn("flex flex-col gap-3 md:hidden", className)}>
          {rows.map((row) => (
            <li key={rowKey(row)} className="rounded-md border border-border bg-surface p-4">
              {renderCard ? renderCard(row) : <DerivedCard columns={columns} row={row} />}
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className={cn(
          "w-full overflow-x-auto rounded-md border border-border",
          adaptive && "hidden md:block",
          className,
        )}
      >
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
                    col.numeric ? "text-end" : "text-start",
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
                      col.numeric && "text-end tabular",
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
    </>
  );
}
