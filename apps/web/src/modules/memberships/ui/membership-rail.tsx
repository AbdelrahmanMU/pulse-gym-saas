import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Circle,
  CircleOff,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/pulse/empty-state";
import { cn } from "@/lib/utils";
import type { MembershipPaymentSummary } from "@/modules/payments";
import type { MemberMembershipTimeline } from "../service";
import { buildRailSegments, type RailSegment } from "../rail-model";
import { Day, MembershipRailCard } from "./membership-rail-card";
import { ShowOlder } from "./membership-rail-client";

/**
 * The Membership Rail (authority §D2, catalog §13.4) — the single visual representation of a
 * member's every immutable membership: one `<ol>` (chronology is semantic), newest first,
 * cards joined by origin-labeled connectors, explicit coverage gaps, a severed line under
 * cancellations, and the "Joined the gym" terminus. Composes A-1 + the payments summary read;
 * owns zero business logic (adjacency grammar lives in the pure rail-model).
 */
const PAST_VISIBLE = 5;

interface RailBlock {
  key: string;
  /** 1-based index among past cards (newest past = 1); `null` for current/next blocks. */
  pastIndex: number | null;
  node: ReactNode;
}

export function MembershipRail({
  timeline,
  summaries,
  sellAction,
}: {
  timeline: MemberMembershipTimeline;
  /** `null` when the actor lacks `payments.read` — money slots are then absent everywhere. */
  summaries: MembershipPaymentSummary[] | null;
  /** The empty rail's call to action (permission-gated by the page). */
  sellAction?: ReactNode;
}) {
  const t = useTranslations("memberships");
  if (timeline.memberships.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          icon={<CircleOff aria-hidden />}
          title={t("railEmptyTitle")}
          description={t("railEmptyBody")}
          action={sellAction}
        />
        <Terminus joinedOn={timeline.joinedOn} />
      </div>
    );
  }

  const summaryById = new Map((summaries ?? []).map((s) => [s.membershipId, s]));
  const total = timeline.memberships.length;
  const ordinalById = new Map(timeline.memberships.map((m, i) => [m.id, total - i]));
  const segments = buildRailSegments(timeline.memberships, timeline.today);

  // Group segments into blocks of [glue-above, card]: a connector/gap describes the relation
  // to the card BELOW it, so it hides and shows with that card ("Show older", §D2.1).
  const head: ReactNode[] = [];
  const blocks: RailBlock[] = [];
  let pendingGlue: ReactNode[] = [];
  let severedAbove = false;
  let pastCount = 0;

  segments.forEach((seg, i) => {
    if (seg.kind === "card") {
      const pastIndex = seg.slot === "past" ? ++pastCount : null;
      blocks.push({
        key: seg.membership.id,
        pastIndex,
        node: (
          <>
            {pendingGlue}
            <MembershipRailCard
              membership={seg.membership}
              slot={seg.slot}
              summary={summaryById.get(seg.membership.id) ?? null}
              ordinal={ordinalById.get(seg.membership.id) ?? 1}
            />
          </>
        ),
      });
      pendingGlue = [];
      severedAbove = seg.severedBelow;
      return;
    }
    const glue = <Glue key={`glue-${i}`} segment={seg} severedAbove={severedAbove} />;
    if (blocks.length === 0) head.push(glue);
    else pendingGlue.push(glue);
  });

  const visible = blocks.filter((b) => b.pastIndex === null || b.pastIndex <= PAST_VISIBLE);
  const older = blocks.filter((b) => b.pastIndex !== null && b.pastIndex > PAST_VISIBLE);

  return (
    <ol className="flex flex-col gap-1.5">
      {head.length > 0 ? <li className="flex flex-col gap-1.5">{head}</li> : null}
      {visible.map((b) => (
        <li key={b.key} className="flex flex-col gap-1.5">
          {b.node}
        </li>
      ))}
      {older.length > 0 ? (
        <ShowOlder count={older.length}>
          {older.map((b) => (
            <li key={b.key} className="flex flex-col gap-1.5">
              {b.node}
            </li>
          ))}
        </ShowOlder>
      ) : null}
      <Terminus joinedOn={timeline.joinedOn} as="li" />
    </ol>
  );
}

/** Non-card rail rows: connectors, gaps, the lapsed head, and the live renewal question. */
function Glue({ segment, severedAbove }: { segment: RailSegment; severedAbove: boolean }) {
  const t = useTranslations("memberships");
  switch (segment.kind) {
    case "gap-to-now":
      return (
        <p className="flex items-center gap-2 py-1 text-body-sm font-medium text-warning-text">
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          {t("gapToNow", { days: segment.days, n: String(segment.days) })}
        </p>
      );
    case "renewal-warning":
      return (
        <p className="flex items-center gap-2 rounded-md border border-dashed border-border-strong px-4 py-2.5 text-body-sm font-medium text-warning-text">
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          {segment.endsInDays === 0
            ? t("renewalWarningToday")
            : t("renewalWarning", { days: segment.endsInDays, n: String(segment.endsInDays) })}
        </p>
      );
    case "connector":
      return (
        // The rail line between two chained cards; it visibly stops under a cancellation.
        <p
          className={cn(
            "ms-6 flex items-center gap-2 border-s-2 py-1.5 ps-4 text-body-sm text-muted-foreground",
            severedAbove ? "border-transparent" : "border-border",
          )}
        >
          <ConnectorIcon variant={segment.variant} />
          <ConnectorLabel segment={segment} />
        </p>
      );
    case "gap":
      return (
        <p
          className={cn(
            "ms-6 border-s-2 border-dashed py-1.5 ps-4 text-body-sm text-muted-foreground",
            severedAbove ? "border-transparent" : "border-border",
          )}
        >
          {t("gap", { days: segment.days, n: String(segment.days) })}
        </p>
      );
    default:
      return null;
  }
}

function ConnectorIcon({ variant }: { variant: "renewed" | "upgraded" | "smaller-plan" }) {
  // Directional arrows mirror under RTL (Authority D8.5); the refresh glyph is symmetric.
  const className = "size-3.5 shrink-0 rtl:-scale-x-100";
  if (variant === "upgraded") return <ArrowUpRight aria-hidden className={className} />;
  if (variant === "smaller-plan") return <ArrowDownRight aria-hidden className={className} />;
  return <RefreshCw aria-hidden className="size-3.5 shrink-0" />;
}

/** Plan names are user data — bidi-isolated inside Arabic sentences (Authority D8.3). */
function PlanName({ children }: { children: ReactNode }) {
  return <span dir="auto">{children}</span>;
}

function ConnectorLabel({ segment }: { segment: Extract<RailSegment, { kind: "connector" }> }) {
  const t = useTranslations("memberships");
  if (segment.variant === "renewed") {
    return (
      <span>
        {t.rich("connectorRenewed", { d: () => <Day iso={segment.soldOn} form="short" /> })}
      </span>
    );
  }
  const key = segment.variant === "upgraded" ? "connectorUpgraded" : "connectorSmaller";
  return (
    <span>
      {t.rich(key, {
        from: () => <PlanName>{segment.fromPlan}</PlanName>,
        to: () => <PlanName>{segment.toPlan}</PlanName>,
      })}
    </span>
  );
}

/** The rail's ground: the relationship, not the first contract (§D2.1). */
function Terminus({ joinedOn, as }: { joinedOn: string | null; as?: "li" }) {
  const t = useTranslations("memberships");
  if (!joinedOn) return null;
  const Tag = as ?? "p";
  return (
    <Tag className="flex items-center gap-2 pt-1 text-body-sm text-muted-foreground">
      <Circle aria-hidden className="size-2.5 shrink-0" />
      <span>
        {t("terminusJoined")} <Day iso={joinedOn} />
      </span>
    </Tag>
  );
}
