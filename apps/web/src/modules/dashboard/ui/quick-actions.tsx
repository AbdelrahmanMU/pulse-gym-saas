import Link from "next/link";
import { CreditCard, UserPlus, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/pulse/button";

/**
 * Dashboard quick actions (Epic-6) — immediate **navigation** to the highest-frequency staff
 * tasks, each shown **by permission** (the page resolves the flags). No business logic here: these
 * are links to the existing create/record flows. Catalogued Button + tokens only.
 */
export interface QuickActionPermissions {
  canAddMember: boolean;
  canSellMembership: boolean;
  canRecordPayment: boolean;
}

export async function QuickActions({ perms }: { perms: QuickActionPermissions }) {
  if (!perms.canAddMember && !perms.canSellMembership && !perms.canRecordPayment) return null;
  const t = await getTranslations("actions");
  return (
    <div className="flex flex-wrap gap-3">
      {perms.canAddMember ? (
        <Button asChild>
          <Link href="/members/new">
            <UserPlus aria-hidden className="size-4" />
            {t("addMember")}
          </Link>
        </Button>
      ) : null}
      {perms.canSellMembership ? (
        <Button asChild variant="secondary">
          <Link href="/memberships/new">
            <CreditCard aria-hidden className="size-4" />
            {t("sellMembership")}
          </Link>
        </Button>
      ) : null}
      {perms.canRecordPayment ? (
        <Button asChild variant="secondary">
          <Link href="/memberships">
            <Wallet aria-hidden className="size-4" />
            {t("recordPayment")}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
