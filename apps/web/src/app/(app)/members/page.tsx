import Link from "next/link";
import { Users } from "lucide-react";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { EmptyState } from "@/components/pulse/empty-state";
import { Button } from "@/components/pulse/button";
import { Pagination } from "@/components/pulse/pagination";
import { CreationFab } from "@/components/pulse/creation-fab";
import { loadMembers, loadTrainerFilterOptions } from "@/modules/members/queries";
import { MembersToolbar } from "@/modules/members/ui/members-toolbar";
import { MembersTable } from "@/modules/members/ui/members-table";

/**
 * Members list (Sprint-1 Epic-2). View gated by `members.read`; a principal lacking it sees
 * the inline Forbidden ErrorState. Search/filter/pagination are URL-param driven and read
 * here, then handed to the module query (which authorizes + scopes by gym). Routing only —
 * data lives in the members module (constitution §2).
 */
type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let principal;
  try {
    principal = await requirePermission(PERMISSION_KEYS.MEMBERS_READ);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const sp = await searchParams;
  const raw = {
    q: first(sp.q),
    status: first(sp.status),
    trainer: first(sp.trainer),
    page: first(sp.page),
  };

  const result = await loadMembers(raw);
  const canCreate = hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERS_CREATE);
  const trainerOptions = hasPermission(principal.permissions, PERMISSION_KEYS.ASSIGNMENTS_READ)
    ? await loadTrainerFilterOptions()
    : [];

  const statusValue = raw.status ?? "ACTIVE";
  const trainerValue = raw.trainer ?? "ALL";
  const hasFilters = Boolean(raw.q) || statusValue !== "ACTIVE" || trainerValue !== "ALL";

  const hrefForPage = (page: number): string => {
    const params = new URLSearchParams();
    if (raw.q) params.set("q", raw.q);
    if (raw.status) params.set("status", raw.status);
    if (raw.trainer) params.set("trainer", raw.trainer);
    params.set("page", String(page));
    return `/members?${params.toString()}`;
  };

  const firstRow = (result.page - 1) * result.pageSize + 1;
  const lastRow = Math.min(result.page * result.pageSize, result.total);

  return (
    <PageContainer>
      <PageHeader title="Members" subtitle="Your gym's members — search, filter, and manage." />

      <MembersToolbar
        query={raw.q ?? ""}
        status={statusValue}
        trainer={trainerValue}
        trainerOptions={trainerOptions}
        canCreate={canCreate}
      />

      <MembersTable
        rows={result.rows}
        empty={
          hasFilters ? (
            <EmptyState
              icon={<Users aria-hidden />}
              title="No members match your filters"
              description="Try a different search term or clear the filters."
            />
          ) : (
            <EmptyState
              icon={<Users aria-hidden />}
              title="No members yet"
              description="Add your first member to start building your roster."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/members/new">Add member</Link>
                  </Button>
                ) : undefined
              }
            />
          )
        }
      />

      {result.totalPages > 1 ? (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          hrefForPage={hrefForPage}
          rangeLabel={`Showing ${firstRow}–${lastRow} of ${result.total}`}
          className="mt-4"
        />
      ) : null}

      {/* Mobile relocation of the single "Add member" primary (AP-6 / Catalog §12.2). */}
      {canCreate ? <CreationFab label="Add member" href="/members/new" /> : null}
    </PageContainer>
  );
}

function Forbidden() {
  return (
    <PageContainer>
      <ErrorState
        variant="inline"
        title="Access denied"
        description="You don't have permission to view members. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
