import Link from "next/link";
import { Users } from "lucide-react";
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

  // Independent reads — fetch concurrently (Performance Recovery, Task 4).
  const [result, trainerOptions] = await Promise.all([
    loadMembers(raw),
    hasPermission(principal.permissions, PERMISSION_KEYS.ASSIGNMENTS_READ)
      ? loadTrainerFilterOptions()
      : Promise.resolve([]),
  ]);
  const canCreate = hasPermission(principal.permissions, PERMISSION_KEYS.MEMBERS_CREATE);

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

  const [t, tActions, tCommon] = await Promise.all([
    getTranslations("members"),
    getTranslations("actions"),
    getTranslations("common"),
  ]);

  return (
    <PageContainer>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

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
              title={t("emptyFilteredTitle")}
              description={t("emptyFilteredBody")}
            />
          ) : (
            <EmptyState
              icon={<Users aria-hidden />}
              title={t("emptyTitle")}
              description={t("emptyBody")}
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/members/new">{tActions("addMember")}</Link>
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
          rangeLabel={tCommon("pageRange", { from: firstRow, to: lastRow, total: result.total })}
          className="mt-4"
        />
      ) : null}

      {/* Mobile relocation of the single "Add member" primary (AP-6 / Catalog §12.2). */}
      {canCreate ? <CreationFab label={tActions("addMember")} href="/members/new" /> : null}
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
