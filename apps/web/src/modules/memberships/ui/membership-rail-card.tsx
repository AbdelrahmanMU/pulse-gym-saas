import type { ReactNode } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FreezeStatus, MembershipStatus } from "@pulse/db";
import { MetricValue } from "@/components/pulse/metric-value";
import { StatusBadge } from "@/components/pulse/status-badge";
import { cn } from "@/lib/utils";
import { formatDate, type DateForm } from "@/lib/format-date";
import { PaymentStandingBadge, type MembershipPaymentSummary } from "@/modules/payments";
import { formatDuration } from "@/modules/plans";
import type { MemberTimelineMembership } from "../service";
import type { RailSlot } from "../rail-model";
import { remainingDaysLabel } from "../format";
import { MembershipStatusBadge } from "./membership-status-badge";
import { RailCardShell } from "./membership-rail-client";

/**
 * One immutable membership as an expandable rail card (catalog §13.3, authority §D2). The
 * collapsed header is the ONLY collapsed form: plan · coverage · status · the one money fact.
 * Expanded panels in fixed order — Coverage → Freezes → Payments — each rendered only when it
 * has content. Server component: every value arrives derived from A-1 / the payments summary
 * read; nothing is computed here beyond copy. No actions render in this phase, on any card.
 * Dates/money/status read the active locale at the source (Localization Authority D6/D7/D9).
 */
export function Day({ iso, form = "full" }: { iso: string; form?: DateForm }) {
  const locale = useLocale();
  return (
    <time dateTime={iso} className="tabular">
      {formatDate(iso, locale, form)}
    </time>
  );
}

const AR_ORDINALS = [
  "",
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
] as const;

function ordinalLabel(n: number, locale: string): string {
  if (locale.toLowerCase().startsWith("ar")) return AR_ORDINALS[n] ?? `رقم ${n}`;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

/** Bidi-isolate a user-entered name inside an Arabic sentence (Authority D8.3). */
function Name({ children }: { children: ReactNode }) {
  return <span dir="auto">{children}</span>;
}

export function MembershipRailCard({
  membership: m,
  slot,
  summary,
  ordinal,
}: {
  membership: MemberTimelineMembership;
  slot: RailSlot;
  /** `null` when the actor lacks `payments.read` — the money slot is then absent, not blank. */
  summary: MembershipPaymentSummary | null;
  /** 1-based position from the oldest membership ("3rd membership" meta, §0.5). */
  ordinal: number;
}) {
  return (
    <div
      className={cn(
        "relative rounded-md border bg-surface",
        slot === "next" ? "border-dashed border-border-strong" : "border-border",
      )}
    >
      {slot === "current" ? (
        // The 3px brand accent-bar — the current membership dominates the rail (§D2.5).
        <span
          aria-hidden
          className="absolute inset-y-0 start-0 w-(--border-accent) rounded-s-md bg-primary"
        />
      ) : null}
      <RailCardShell
        defaultOpen={slot === "current"}
        header={<Header m={m} slot={slot} summary={summary} />}
      >
        <div className="flex flex-col gap-3">
          <CoveragePanel m={m} slot={slot} ordinal={ordinal} />
          <FreezesPanel m={m} />
          {summary ? <PaymentsPanel summary={summary} /> : null}
        </div>
      </RailCardShell>
    </div>
  );
}

function Header({
  m,
  slot,
  summary,
}: {
  m: MemberTimelineMembership;
  slot: RailSlot;
  summary: MembershipPaymentSummary | null;
}) {
  const t = useTranslations("memberships");
  const muted = slot === "past";
  return (
    <>
      {slot === "next" ? <StatusBadge tone="info" label={t("railNext")} size="sm" /> : null}
      <span className={cn("min-w-0 truncate font-medium", muted && "text-muted-foreground")}>
        <Name>{m.planName}</Name>
      </span>
      <span className={cn("text-body-sm", muted ? "text-muted-foreground" : "text-foreground")}>
        {slot === "next" ? (
          <>
            {t("railStarts")} <Day iso={m.startDate} form="short" />
          </>
        ) : (
          <>
            <Day iso={m.startDate} form="short" />
            {t("railRangeSep")}
            {m.status === MembershipStatus.CANCELLED && m.cancelledOn ? (
              <>
                {t("railCancelledMid")} <Day iso={m.cancelledOn} form="short" />
              </>
            ) : (
              <Day iso={m.effectiveEndDate} form="short" />
            )}
          </>
        )}
      </span>
      {slot !== "next" ? (
        <MembershipStatusBadge status={m.status} isExpiringSoon={m.isExpiringSoon} size="sm" />
      ) : null}
      {summary ? <HeaderMoney summary={summary} slot={slot} /> : null}
    </>
  );
}

/** The ONE money fact a header may carry (§D2.2); a queued card tags it "unpaid" (§D5.1). */
function HeaderMoney({ summary, slot }: { summary: MembershipPaymentSummary; slot: RailSlot }) {
  const t = useTranslations("money");
  if (BigInt(summary.remainingMinor) > 0n) {
    return (
      <span className="ms-auto flex shrink-0 items-center gap-1 text-body-sm font-medium text-warning-text">
        <TriangleAlert aria-hidden className="size-3.5" />
        {slot === "next" ? t("unpaid") : t("owes")}{" "}
        <MetricValue
          value={summary.remainingMinor}
          format="currency"
          currency={summary.currency}
          size="sm"
        />
      </span>
    );
  }
  return (
    <span className="ms-auto flex shrink-0 items-center gap-1 text-body-sm text-success-text">
      <CircleCheck aria-hidden className="size-3.5" />
      {t("paid")}
    </span>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 border-t border-border pt-3 first:border-0 first:pt-0">
      <h4 className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}

function CoveragePanel({
  m,
  slot,
  ordinal,
}: {
  m: MemberTimelineMembership;
  slot: RailSlot;
  ordinal: number;
}) {
  const t = useTranslations("memberships");
  const locale = useLocale();
  const openFreeze = m.freezes.find((f) => f.status === FreezeStatus.ACTIVE) ?? null;
  const remaining = remainingDaysLabel(m.status, m.remainingDays);
  return (
    <Panel title={t("panelCoverage")}>
      <p className="text-body-sm text-foreground">
        {slot === "next" ? t("coverageStarts") : t("coverageStarted")} <Day iso={m.startDate} />{" "}
        {t("coverageEndsMid")} <Day iso={m.effectiveEndDate} /> {t("lastDayIncluded")}
        {m.status === MembershipStatus.ACTIVE ? (
          <span className="text-muted-foreground">
            {" — "}
            {t(remaining.key, remaining.values)}
          </span>
        ) : null}
      </p>
      {m.status === MembershipStatus.FROZEN && m.activeFreeze && openFreeze ? (
        <p className="text-body-sm text-foreground">
          {t("frozenSince")} <Day iso={openFreeze.freezeStart} />{" "}
          {t("plannedDays", {
            days: m.activeFreeze.plannedDays,
            n: String(m.activeFreeze.plannedDays),
          })}{" "}
          <span className="text-muted-foreground">
            {t("projectedEnd")} <Day iso={m.activeFreeze.projectedEndDate} /> {t("estimate")}
          </span>
        </p>
      ) : null}
      {m.status === MembershipStatus.CANCELLED && m.cancelledOn ? (
        <p className="text-body-sm text-danger-text">
          {t("coverageCancelled")} <Day iso={m.cancelledOn} />
          {m.cancelledByName ? (
            <>
              {t("coverageBy")}
              <Name>{m.cancelledByName}</Name>
            </>
          ) : null}
        </p>
      ) : null}
      <p className="text-body-sm text-foreground">
        <MetricValue value={m.priceMinor} format="currency" currency={m.currency} size="sm" />
        {" · "}
        {formatDuration(m.durationValue, m.durationUnit, locale)}
      </p>
      <p className="text-caption text-muted-foreground">
        {t.rich("ordinalMembership", {
          ordinal: ordinalLabel(ordinal, locale),
          name: () => <Name>{m.soldByName}</Name>,
        })}
      </p>
    </Panel>
  );
}

function FreezesPanel({ m }: { m: MemberTimelineMembership }) {
  const t = useTranslations("memberships");
  if (m.freezes.length === 0) return null;
  return (
    <Panel title={t("panelFreezes")}>
      <ul className="flex flex-col gap-1">
        {m.freezes.map((f) => (
          <li key={`${f.freezeStart}-${f.status}`} className="text-body-sm text-foreground">
            {f.actualEnd
              ? t.rich("freezeResumed", {
                  days: f.frozenDays,
                  n: String(f.frozenDays),
                  s: () => <Day iso={f.freezeStart} />,
                  e: () => <Day iso={f.actualEnd ?? ""} />,
                })
              : t.rich("freezeOngoing", {
                  s: () => <Day iso={f.freezeStart} />,
                })}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The membership's own money story, summary grade — the full ledger arrives in a later phase. */
function PaymentsPanel({ summary }: { summary: MembershipPaymentSummary }) {
  const t = useTranslations("money");
  const tm = useTranslations("memberships");
  const remaining = BigInt(summary.remainingMinor);
  const overBefore = t("overBefore");
  const overAfter = t("overAfter");
  return (
    <Panel title={tm("panelPayments")}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-foreground">
        <span>
          {t("paid")}{" "}
          <MetricValue
            value={summary.totalPaidMinor}
            format="currency"
            currency={summary.currency}
            size="sm"
          />{" "}
          {t("of")}{" "}
          <MetricValue
            value={summary.priceMinor}
            format="currency"
            currency={summary.currency}
            size="sm"
          />
          {remaining > 0n ? (
            <span className="font-medium text-warning-text">
              {" · "}
              {t("owes")}{" "}
              <MetricValue
                value={summary.remainingMinor}
                format="currency"
                currency={summary.currency}
                size="sm"
              />
            </span>
          ) : null}
          {remaining < 0n ? (
            <span className="text-muted-foreground">
              {" ("}
              {overBefore ? `${overBefore} ` : ""}
              <MetricValue
                value={(-remaining).toString()}
                format="currency"
                currency={summary.currency}
                size="sm"
              />
              {overAfter ? ` ${overAfter}` : ""}
              {")"}
            </span>
          ) : null}
        </span>
        <PaymentStandingBadge standing={summary.standing} size="sm" />
      </p>
    </Panel>
  );
}
