import Link from "next/link";
import { Users2 } from "lucide-react";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { EmptyState } from "@/components/pulse/empty-state";
import { Button } from "@/components/pulse/button";
import { Pagination } from "@/components/pulse/pagination";
import { loadStaff } from "@/modules/staff/queries";
import { StaffToolbar } from "@/modules/staff/ui/staff-toolbar";
import { StaffTable } from "@/modules/staff/ui/staff-table";

/**
 * Staff list (Sprint-1 Epic-9). View gated by `staff.read`; a principal lacking it sees the inline
 * Forbidden ErrorState. Search/status/pagination are URL-param driven and handed to the module query
 * (which authorizes + scopes by gym). Routing only — data lives in the staff module (constitution §2).
 */
type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let principal;
  try {
    principal = await requirePermission(PERMISSION_KEYS.STAFF_READ);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const sp = await searchParams;
  const raw = { q: first(sp.q), status: first(sp.status), page: first(sp.page) };

  const result = await loadStaff(raw);
  const canCreate = hasPermission(principal.permissions, PERMISSION_KEYS.STAFF_INVITE);

  const statusValue = raw.status ?? "ACTIVE";
  const hasFilters = Boolean(raw.q) || statusValue !== "ACTIVE";

  const hrefForPage = (page: number): string => {
    const params = new URLSearchParams();
    if (raw.q) params.set("q", raw.q);
    if (raw.status) params.set("status", raw.status);
    params.set("page", String(page));
    return `/staff?${params.toString()}`;
  };

  const firstRow = (result.page - 1) * result.pageSize + 1;
  const lastRow = Math.min(result.page * result.pageSize, result.total);

  return (
    <PageContainer>
      <PageHeader
        title="Staff"
        subtitle="The people who run your gym — roles, access, and status."
      />

      <StaffToolbar query={raw.q ?? ""} status={statusValue} canCreate={canCreate} />

      <StaffTable
        rows={result.rows}
        empty={
          hasFilters ? (
            <EmptyState
              icon={<Users2 aria-hidden />}
              title="No staff match your filters"
              description="Try a different search term or clear the filters."
            />
          ) : (
            <EmptyState
              icon={<Users2 aria-hidden />}
              title="No staff yet"
              description="Add your first staff member to give your team access."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/staff/new">Add staff</Link>
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
    </PageContainer>
  );
}

function Forbidden() {
  return (
    <PageContainer>
      <ErrorState
        variant="inline"
        title="Access denied"
        description="You don't have permission to view staff. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
