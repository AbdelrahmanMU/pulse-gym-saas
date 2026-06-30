import { Activity } from "lucide-react";
import type { TimelineEntry } from "../service";

/**
 * Membership lifecycle timeline (Decision C) — a read-only, append-only narrative composed in
 * the service from immutable records (created/activated/frozen/resumed/cancelled). Dates render
 * as `<time>`; no business logic here, presentation only. Tokens only.
 */
const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export function MembershipTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-body text-muted-foreground">No lifecycle events yet.</p>;
  }
  return (
    <ol className="flex flex-col gap-4">
      {entries.map((entry, i) => (
        <li key={`${entry.at.getTime()}-${i}`} className="flex gap-3">
          <span aria-hidden className="mt-0.5 text-muted-foreground [&_svg]:size-4">
            <Activity />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-body font-medium text-foreground">{entry.title}</span>
            {entry.detail ? (
              <span className="text-body-sm text-muted-foreground">{entry.detail}</span>
            ) : null}
            <time
              dateTime={isoDate(entry.at)}
              className="tabular text-body-sm text-muted-foreground"
            >
              {isoDate(entry.at)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
