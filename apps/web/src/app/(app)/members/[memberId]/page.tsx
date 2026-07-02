import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CircleCheck, CircleOff, Pencil, Plus, Snowflake } from "lucide-react";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { StatusBadge } from "@/components/pulse/status-badge";
import { StickyMobileActionBar } from "@/components/pulse/sticky-mobile-action-bar";
import { loadAssignableTrainers, loadMember } from "@/modules/members/queries";
import { loadMemberMembershipStanding } from "@/modules/memberships/queries";
import type { MemberMembershipStanding } from "@/modules/memberships";
import type { MemberDetail } from "@/modules/members/service";
import { MemberStatusBadge } from "@/modules/members/ui/member-status-badge";
import { AssignTrainerForm } from "@/modules/members/ui/assign-trainer-form";
import { MemberArchiveControls } from "@/modules/members/ui/member-archive-controls";

/**
 * Member profile (Sprint-1 Epic-2). Gated by `members.read`. Hosts the per-member actions —
 * edit (`members.update`), archive/reactivate (`members.archive`/`reactivate`), and
 * responsible-trainer assignment (`assignments.manage`) — each shown **by permission**. A
 * cross-gym or unknown id surfaces as 404 (never reveals another gym's record). Routing
 * only — data + mutations live in the members module (constitution §2).
 */
const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  let principal;
  try {
    principal = await requirePermission(PERMISSION_KEYS.MEMBERS_READ);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const { memberId } = await params;
  let member: MemberDetail;
  try {
    member = await loadMember(memberId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const canUpdate = hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERS_UPDATE);
  const canArchive = hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERS_ARCHIVE);
  const canReactivate = hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERS_REACTIVATE);
  const canReadAssignments = hasPermission(principal.permissions, PERMISSION_KEYS.ASSIGNMENTS_READ);
  const canManageAssignments = hasPermission(
    principal.permissions,
    PERMISSION_KEYS.ASSIGNMENTS_MANAGE,
  );
  const trainerOptions = canManageAssignments ? await loadAssignableTrainers() : [];
  const canSellMembership =
    member.status === "ACTIVE" &&
    hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_CREATE);

  // P0 operational strip (v1.2 §6, DD-9): the member's membership standing, composed from the
  // memberships module's public derived read (the same one the archive policy uses). Shown only
  // with `memberships.read` — the page itself needs only `members.read`, exactly as before.
  const canReadMemberships = hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_READ);
  const standing: MemberMembershipStanding | null = canReadMemberships
    ? await loadMemberMembershipStanding(member.id)
    : null;

  return (
    <PageContainer>
      <PageHeader
        title={member.fullName}
        actions={
          canUpdate || canSellMembership ? (
            // ≥md only — on mobile these relocate to the Sticky Action Bar (AP-6 / §12.3).
            <>
              {canSellMembership ? (
                <Button asChild className="max-md:hidden">
                  <Link href={`/memberships/new?memberId=${member.id}`}>
                    <Plus aria-hidden className="size-4" />
                    Sell membership
                  </Link>
                </Button>
              ) : null}
              {canUpdate ? (
                <Button asChild variant="secondary" className="max-md:hidden">
                  <Link href={`/members/${member.id}/edit`}>
                    <Pencil aria-hidden className="size-4" />
                    Edit
                  </Link>
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <MemberStatusBadge status={member.status} />
        {standing ? <MembershipStandingChips standing={standing} /> : null}
        {member.trainerName ? (
          <span className="text-body-sm text-muted-foreground">
            Trainer: <span className="text-foreground">{member.trainerName}</span>
          </span>
        ) : null}
        {standing ? (
          <Link
            href={`/memberships?q=${encodeURIComponent(member.fullName)}`}
            className="text-body-sm text-accent-text hover:underline"
          >
            View memberships
          </Link>
        ) : null}
      </div>

      {/* Section order is operational-first (v1.2 §6 / AP-5, DD-9): P1 relationships and
          lifecycle actions before P2 contact/metadata. One DOM order, both presentations. */}
      <div className="grid gap-6 md:grid-cols-2">
        {canReadAssignments ? (
          <Section title="Responsible trainer">
            {canManageAssignments ? (
              <AssignTrainerForm
                memberId={member.id}
                currentTrainerGymUserId={member.trainerGymUserId}
                options={trainerOptions}
              />
            ) : (
              <p className="text-body text-foreground">
                {member.trainerName ?? (
                  <span className="text-muted-foreground">No trainer assigned</span>
                )}
              </p>
            )}
          </Section>
        ) : null}

        {(canArchive || canReactivate) &&
        (member.status === "ACTIVE" ? canArchive : canReactivate) ? (
          <Section title="Lifecycle">
            <MemberArchiveControls
              memberId={member.id}
              status={member.status}
              canArchive={canArchive}
              canReactivate={canReactivate}
            />
          </Section>
        ) : null}

        <Section title="Contact">
          <Detail label="Phone" value={member.phone} />
          <Detail label="Email" value={member.email} />
        </Section>

        <Section title="Details">
          <Detail label="Date of birth" date={member.dateOfBirth} />
          <Detail label="Gender" value={member.gender} />
          <Detail label="Joined on" date={member.joinedOn} />
        </Section>
      </div>

      {canSellMembership || canUpdate ? (
        // Thumb-zone relocation of the header actions (<md only — §5.3 detail variant).
        <StickyMobileActionBar className="mt-6 md:hidden">
          {canUpdate ? (
            <Button asChild variant="secondary">
              <Link href={`/members/${member.id}/edit`}>
                <Pencil aria-hidden className="size-4" />
                Edit
              </Link>
            </Button>
          ) : null}
          {canSellMembership ? (
            <Button asChild>
              <Link href={`/memberships/new?memberId=${member.id}`}>
                <Plus aria-hidden className="size-4" />
                Sell membership
              </Link>
            </Button>
          ) : null}
        </StickyMobileActionBar>
      ) : null}
    </PageContainer>
  );
}

/**
 * The membership-standing cues (P0): icon + label + `*-text` token — never color alone.
 * Booleans only (no dates/amounts) — that fuller member workspace is a pending product
 * decision; these chips are its composition-only forerunner.
 */
function MembershipStandingChips({ standing }: { standing: MemberMembershipStanding }) {
  const none =
    !standing.hasActiveMembership &&
    !standing.hasScheduledMembership &&
    !standing.hasFrozenMembership;
  return (
    <>
      {standing.hasActiveMembership ? (
        <StatusBadge tone="success" icon={<CircleCheck />} label="Active membership" size="sm" />
      ) : null}
      {standing.hasFrozenMembership ? (
        <StatusBadge tone="info" icon={<Snowflake />} label="Frozen membership" size="sm" />
      ) : null}
      {standing.hasScheduledMembership ? (
        <StatusBadge tone="info" icon={<CalendarClock />} label="Scheduled membership" size="sm" />
      ) : null}
      {none ? (
        <StatusBadge tone="warning" icon={<CircleOff />} label="No live membership" size="sm" />
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6">
      <h2 className="text-h3 text-foreground">{title}</h2>
      <dl className="flex flex-col gap-3">{children}</dl>
    </section>
  );
}

function Detail({
  label,
  value,
  date,
}: {
  label: string;
  value?: string | null;
  date?: Date | null;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-body-sm text-muted-foreground">{label}</dt>
      <dd className="text-body text-foreground">
        {date ? (
          <time dateTime={isoDate(date)} className="tabular">
            {isoDate(date)}
          </time>
        ) : value ? (
          value
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </dd>
    </div>
  );
}

function Forbidden() {
  return (
    <PageContainer>
      <ErrorState
        variant="inline"
        title="Access denied"
        description="You don't have permission to view this member. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/members">Back to members</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
