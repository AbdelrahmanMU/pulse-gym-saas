import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { EmptyState } from "@/components/pulse/empty-state";
import { Button } from "@/components/pulse/button";
import { Pagination } from "@/components/pulse/pagination";
import { loadMemberships } from "@/modules/memberships/queries";
import { MembershipsToolbar } from "@/modules/memberships/ui/memberships-toolbar";
import { MembershipsTable } from "@/modules/memberships/ui/memberships-table";

/**
 * Memberships list (Sprint-1 Epic-4). View gated by `memberships.read`; a principal lacking it
 * sees the inline Forbidden ErrorState. Search (member name)/status filter/pagination are
 * URL-param driven and read here, then handed to the module query (which authorizes + scopes by
 * gym and derives status live). Routing only.
 */
type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let principal;
  try {
    principal = await requirePermission(PERMISSION_KEYS.MEMBERSHIPS_READ);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const sp = await searchParams;
  const raw = { q: first(sp.q), status: first(sp.status), page: first(sp.page) };
  const result = await loadMemberships(raw);
  const canCreate = hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERSHIPS_CREATE);

  const statusValue = raw.status ?? "ALL";
  const hasFilters = Boolean(raw.q) || statusValue !== "ALL";

  const hrefForPage = (page: number): string => {
    const params = new URLSearchParams();
    if (raw.q) params.set("q", raw.q);
    if (raw.status) params.set("status", raw.status);
    params.set("page", String(page));
    return `/memberships?${params.toString()}`;
  };

  const firstRow = (result.page - 1) * result.pageSize + 1;
  const lastRow = Math.min(result.page * result.pageSize, result.total);

  return (
    <PageContainer>
      <PageHeader title="Memberships" subtitle="Every membership period your gym has sold." />

      <MembershipsToolbar query={raw.q ?? ""} status={statusValue} canCreate={canCreate} />

      <MembershipsTable
        rows={result.rows}
        empty={
          hasFilters ? (
            <EmptyState
              icon={<ClipboardList aria-hidden />}
              title="No memberships match your filters"
              description="Try a different search term or clear the filters."
            />
          ) : (
            <EmptyState
              icon={<ClipboardList aria-hidden />}
              title="No memberships yet"
              description="Sell a plan to a member to create their first membership."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/memberships/new">Sell membership</Link>
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
        description="You don't have permission to view memberships. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
