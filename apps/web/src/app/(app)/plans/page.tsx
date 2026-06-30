import Link from "next/link";
import { Tags } from "lucide-react";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { AuthorizationError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { EmptyState } from "@/components/pulse/empty-state";
import { Button } from "@/components/pulse/button";
import { Pagination } from "@/components/pulse/pagination";
import { loadPlans } from "@/modules/plans/queries";
import { PlansToolbar } from "@/modules/plans/ui/plans-toolbar";
import { PlansTable } from "@/modules/plans/ui/plans-table";

/**
 * Plans list (Sprint-1 Epic-3). View gated by `plans.read`; a principal lacking it sees the
 * inline Forbidden ErrorState. Search/filter/pagination are URL-param driven and read here,
 * then handed to the module query (which authorizes + scopes by gym). Routing only.
 */
type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let principal;
  try {
    principal = await requirePermission(PERMISSION_KEYS.PLANS_READ);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const sp = await searchParams;
  const raw = { q: first(sp.q), status: first(sp.status), page: first(sp.page) };
  const result = await loadPlans(raw);
  const canCreate = hasPermission(principal.permissions, PERMISSION_KEYS.PLANS_CREATE);

  const statusValue = raw.status ?? "ACTIVE";
  const hasFilters = Boolean(raw.q) || statusValue !== "ACTIVE";

  const hrefForPage = (page: number): string => {
    const params = new URLSearchParams();
    if (raw.q) params.set("q", raw.q);
    if (raw.status) params.set("status", raw.status);
    params.set("page", String(page));
    return `/plans?${params.toString()}`;
  };

  const firstRow = (result.page - 1) * result.pageSize + 1;
  const lastRow = Math.min(result.page * result.pageSize, result.total);

  return (
    <PageContainer>
      <PageHeader title="Plans" subtitle="The membership plans your gym sells." />

      <PlansToolbar query={raw.q ?? ""} status={statusValue} canCreate={canCreate} />

      <PlansTable
        rows={result.rows}
        empty={
          hasFilters ? (
            <EmptyState
              icon={<Tags aria-hidden />}
              title="No plans match your filters"
              description="Try a different search term or clear the filters."
            />
          ) : (
            <EmptyState
              icon={<Tags aria-hidden />}
              title="No plans yet"
              description="Create your first plan so staff can sell memberships."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/plans/new">Add plan</Link>
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
        description="You don't have permission to view plans. Contact your gym owner."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
