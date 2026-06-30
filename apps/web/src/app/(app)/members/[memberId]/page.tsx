import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { loadAssignableTrainers, loadMember } from "@/modules/members/queries";
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

  return (
    <PageContainer>
      <PageHeader
        title={member.fullName}
        actions={
          canUpdate ? (
            <Button asChild variant="secondary">
              <Link href={`/members/${member.id}/edit`}>
                <Pencil aria-hidden className="size-4" />
                Edit
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex items-center gap-3">
        <MemberStatusBadge status={member.status} />
        {member.trainerName ? (
          <span className="text-body-sm text-muted-foreground">
            Trainer: <span className="text-foreground">{member.trainerName}</span>
          </span>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Contact">
          <Detail label="Phone" value={member.phone} />
          <Detail label="Email" value={member.email} />
        </Section>

        <Section title="Details">
          <Detail label="Date of birth" date={member.dateOfBirth} />
          <Detail label="Gender" value={member.gender} />
          <Detail label="Joined on" date={member.joinedOn} />
        </Section>

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
      </div>
    </PageContainer>
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
