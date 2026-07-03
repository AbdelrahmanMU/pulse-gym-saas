import type { ReactNode } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { FreezeStatus, MembershipStatus } from "@pulse/db";
import { MetricValue } from "@/components/pulse/metric-value";
import { StatusBadge } from "@/components/pulse/status-badge";
import { cn } from "@/lib/utils";
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
 */
const short = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const full = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const shortDay = (iso: string): string => short.format(new Date(`${iso}T00:00:00Z`));
const fullDay = (iso: string): string => full.format(new Date(`${iso}T00:00:00Z`));

export function Day({ iso, form = "full" }: { iso: string; form?: "short" | "full" }) {
  return (
    <time dateTime={iso} className="tabular">
      {form === "short" ? shortDay(iso) : fullDay(iso)}
    </time>
  );
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
          className="absolute inset-y-0 left-0 w-(--border-accent) rounded-l-md bg-primary"
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
  const muted = slot === "past";
  return (
    <>
      {slot === "next" ? <StatusBadge tone="info" label="Next" size="sm" /> : null}
      <span className={cn("min-w-0 truncate font-medium", muted && "text-muted-foreground")}>
        {m.planName}
      </span>
      <span className={cn("text-body-sm", muted ? "text-muted-foreground" : "text-foreground")}>
        {slot === "next" ? (
          <>
            starts <Day iso={m.startDate} form="short" />
          </>
        ) : (
          <>
            <Day iso={m.startDate} form="short" />
            {" → "}
            {m.status === MembershipStatus.CANCELLED && m.cancelledOn ? (
              <>
                cancelled <Day iso={m.cancelledOn} form="short" />
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
  if (BigInt(summary.remainingMinor) > 0n) {
    return (
      <span className="ml-auto flex shrink-0 items-center gap-1 text-body-sm font-medium text-warning-text">
        <TriangleAlert aria-hidden className="size-3.5" />
        {slot === "next" ? "unpaid" : "Owes"}{" "}
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
    <span className="ml-auto flex shrink-0 items-center gap-1 text-body-sm text-success-text">
      <CircleCheck aria-hidden className="size-3.5" />
      Paid
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
  const openFreeze = m.freezes.find((f) => f.status === FreezeStatus.ACTIVE) ?? null;
  return (
    <Panel title="Coverage">
      <p className="text-body-sm text-foreground">
        {slot === "next" ? "Starts" : "Started"} <Day iso={m.startDate} />
        {" · Ends "}
        <Day iso={m.effectiveEndDate} /> (last day included)
        {m.status === MembershipStatus.ACTIVE ? (
          <span className="text-muted-foreground">
            {" — "}
            {remainingDaysLabel(m.status, m.remainingDays)}
          </span>
        ) : null}
      </p>
      {m.status === MembershipStatus.FROZEN && m.activeFreeze && openFreeze ? (
        <p className="text-body-sm text-foreground">
          Frozen since <Day iso={openFreeze.freezeStart} /> · planned {m.activeFreeze.plannedDays}{" "}
          days ·{" "}
          <span className="text-muted-foreground">
            projected end <Day iso={m.activeFreeze.projectedEndDate} /> (estimate)
          </span>
        </p>
      ) : null}
      {m.status === MembershipStatus.CANCELLED && m.cancelledOn ? (
        <p className="text-body-sm text-danger-text">
          Cancelled <Day iso={m.cancelledOn} />
          {m.cancelledByName ? ` by ${m.cancelledByName}` : null}
        </p>
      ) : null}
      <p className="text-body-sm text-foreground">
        <MetricValue value={m.priceMinor} format="currency" currency={m.currency} size="sm" />
        {" · "}
        {formatDuration(m.durationValue, m.durationUnit)}
      </p>
      <p className="text-caption text-muted-foreground">
        {ordinalLabel(ordinal)} membership · sold by {m.soldByName}
      </p>
    </Panel>
  );
}

function FreezesPanel({ m }: { m: MemberTimelineMembership }) {
  if (m.freezes.length === 0) return null;
  return (
    <Panel title="Freezes">
      <ul className="flex flex-col gap-1">
        {m.freezes.map((f) => (
          <li key={`${f.freezeStart}-${f.status}`} className="text-body-sm text-foreground">
            {f.actualEnd ? (
              <>
                Frozen <Day iso={f.freezeStart} /> → resumed <Day iso={f.actualEnd} /> ·{" "}
                {f.frozenDays} day{f.frozenDays === 1 ? "" : "s"} · end extended {f.frozenDays} day
                {f.frozenDays === 1 ? "" : "s"}
              </>
            ) : (
              <>
                Frozen <Day iso={f.freezeStart} /> · ongoing
              </>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The membership's own money story, summary grade — the full ledger arrives in a later phase. */
function PaymentsPanel({ summary }: { summary: MembershipPaymentSummary }) {
  const remaining = BigInt(summary.remainingMinor);
  return (
    <Panel title="Payments">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-foreground">
        <span>
          Paid{" "}
          <MetricValue
            value={summary.totalPaidMinor}
            format="currency"
            currency={summary.currency}
            size="sm"
          />{" "}
          of{" "}
          <MetricValue
            value={summary.priceMinor}
            format="currency"
            currency={summary.currency}
            size="sm"
          />
          {remaining > 0n ? (
            <span className="font-medium text-warning-text">
              {" · Owes "}
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
              <MetricValue
                value={(-remaining).toString()}
                format="currency"
                currency={summary.currency}
                size="sm"
              />
              {" over)"}
            </span>
          ) : null}
        </span>
        <PaymentStandingBadge standing={summary.standing} size="sm" />
      </p>
    </Panel>
  );
}

function ordinalLabel(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}
