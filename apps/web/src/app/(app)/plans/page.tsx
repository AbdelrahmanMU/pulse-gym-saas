import Link from "next/link";
import { Tags } from "lucide-react";
import { getTranslations } from "next-intl/server";
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

  const t = await getTranslations("plans");
  const tc = await getTranslations("common");
  const ta = await getTranslations("actions");

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
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <PlansToolbar query={raw.q ?? ""} status={statusValue} canCreate={canCreate} />

      <PlansTable
        rows={result.rows}
        empty={
          hasFilters ? (
            <EmptyState
              icon={<Tags aria-hidden />}
              title={t("emptyFilteredTitle")}
              description={t("emptyFilteredBody")}
            />
          ) : (
            <EmptyState
              icon={<Tags aria-hidden />}
              title={t("emptyTitle")}
              description={t("emptyBody")}
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/plans/new">{ta("addPlan")}</Link>
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
          rangeLabel={tc("pageRange", {
            from: String(firstRow),
            to: String(lastRow),
            total: String(result.total),
          })}
          className="mt-4"
        />
      ) : null}

      {/* Mobile relocation of the single "Add plan" primary (AP-6 / Catalog §12.2). */}
      {canCreate ? <CreationFab label={ta("addPlan")} href="/plans/new" /> : null}
    </PageContainer>
  );
}

async function Forbidden() {
  const t = await getTranslations("errors");
  return (
    <PageContainer>
      <ErrorState
        variant="inline"
        title={t("accessDenied")}
        description={t("forbiddenBody")}
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">{t("backToDashboard")}</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
