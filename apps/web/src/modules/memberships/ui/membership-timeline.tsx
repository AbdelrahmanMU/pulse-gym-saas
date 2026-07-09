import { Activity } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { TimelineEntry } from "../service";
import { formatDate, toISODate } from "@/lib/format-date";

/**
 * Membership lifecycle timeline (Decision C) — a read-only, append-only narrative composed in
 * the service from immutable records (created/activated/frozen/resumed/cancelled). Dates render
 * as `<time>`; no business logic here, presentation only. Tokens only. The `entry.title`/`detail`
 * are service-composed English strings (a documented localization residual — see report).
 */
export async function MembershipTimeline({ entries }: { entries: TimelineEntry[] }) {
  const t = await getTranslations("memberships");
  const locale = await getLocale();
  if (entries.length === 0) {
    return <p className="text-body text-muted-foreground">{t("timelineEmpty")}</p>;
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
              dateTime={toISODate(entry.at)}
              className="tabular text-body-sm text-muted-foreground"
            >
              {formatDate(entry.at, locale, "iso")}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
