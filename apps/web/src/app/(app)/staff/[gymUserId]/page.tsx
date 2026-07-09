import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { hasPermission, PERMISSION_KEYS } from "@pulse/auth";
import { requirePermission } from "@/lib/auth/guard";
import { formatDate, toISODate } from "@/lib/format-date";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { PageContainer } from "@/components/pulse/page-container";
import { PageHeader } from "@/components/pulse/page-header";
import { ErrorState } from "@/components/pulse/error-state";
import { Button } from "@/components/pulse/button";
import { loadAssignableRoles, loadStaffMember } from "@/modules/staff/queries";
import type { StaffDetail } from "@/modules/staff/service";
import { StaffStatusBadge } from "@/modules/staff/ui/staff-status-badge";
import { StaffRoleControl } from "@/modules/staff/ui/staff-role-control";
import { StaffStatusControls } from "@/modules/staff/ui/staff-status-controls";

/**
 * Staff detail (Sprint-1 Epic-9). Gated by `staff.read`. Hosts the per-staff actions — edit
 * (`staff.manage`), role assignment (`roles.manage`), and suspend/reactivate (`staff.manage`) —
 * each shown **by permission**. A cross-gym/unknown id surfaces as 404. Routing only — data +
 * mutations live in the staff module (constitution §2).
 */
export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ gymUserId: string }>;
}) {
  let principal;
  try {
    principal = await requirePermission(PERMISSION_KEYS.STAFF_READ);
  } catch (error) {
    if (error instanceof AuthorizationError) return <Forbidden />;
    throw error;
  }

  const { gymUserId } = await params;
  let staff: StaffDetail;
  try {
    staff = await loadStaffMember(gymUserId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const canManage = hasPermission(principal.permissions, PERMISSION_KEYS.STAFF_MANAGE);
  const canManageRoles = hasPermission(principal.permissions, PERMISSION_KEYS.ROLES_MANAGE);
  const roleOptions = canManageRoles ? await loadAssignableRoles() : [];
  const t = await getTranslations("staff");
  const locale = await getLocale();

  return (
    <PageContainer>
      <PageHeader
        title={staff.displayName}
        actions={
          canManage ? (
            <Button asChild variant="secondary">
              <Link href={`/staff/${staff.id}/edit`}>
                <Pencil aria-hidden className="size-4" />
                {t("editButton")}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex items-center gap-3">
        <StaffStatusBadge status={staff.status} />
        <span className="text-body-sm text-muted-foreground">
          {t("roleLabel")} <span className="text-foreground">{staff.roleName}</span>
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title={t("sectionContact")}>
          <Detail label={t("detailEmail")} value={staff.email} ltr />
          <Detail label={t("detailPhone")} value={staff.phone} ltr />
        </Section>

        <Section title={t("sectionAccount")}>
          <Detail
            label={t("detailLastLogin")}
            date={staff.lastLoginAt}
            emptyLabel={t("detailLastLoginNever")}
            locale={locale}
          />
          <Detail label={t("detailAdded")} date={staff.createdAt} locale={locale} />
          {staff.status === "REVOKED" ? (
            <Detail label={t("detailSuspended")} date={staff.revokedAt} locale={locale} />
          ) : null}
        </Section>

        {canManageRoles ? (
          <Section title={t("sectionRole")}>
            <StaffRoleControl
              gymUserId={staff.id}
              currentRoleId={staff.roleId}
              currentRoleName={staff.roleName}
              roleOptions={roleOptions}
              isSelf={staff.isSelf}
            />
          </Section>
        ) : null}

        {canManage ? (
          <Section title={t("sectionAccess")}>
            <StaffStatusControls gymUserId={staff.id} status={staff.status} isSelf={staff.isSelf} />
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
  emptyLabel = "—",
  locale,
  ltr = false,
}: {
  label: string;
  value?: string | null;
  date?: Date | null;
  emptyLabel?: string;
  locale?: string;
  /** Force LTR for identity data that corrupts in an RTL run (email, phone) — Authority D8.3. */
  ltr?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-body-sm text-muted-foreground">{label}</dt>
      <dd className="text-body text-foreground">
        {date ? (
          <time dateTime={toISODate(date)} className="tabular">
            {formatDate(date, locale ?? "en", "iso")}
          </time>
        ) : value ? (
          ltr ? (
            <span dir="ltr" className="inline-block text-start">
              {value}
            </span>
          ) : (
            value
          )
        ) : (
          <span className="text-muted-foreground">{emptyLabel}</span>
        )}
      </dd>
    </div>
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
