import Link from "next/link";
import { CreditCard, UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/pulse/button";

/**
 * Dashboard quick actions (Epic-6) — immediate **navigation** to the highest-frequency staff
 * tasks, each shown **by permission** (the page resolves the flags). No business logic here: these
 * are links to the existing create flows. Catalogued Button + tokens only.
 *
 * Deliberately **entity-creation only** (Add member · Sell membership): recording a payment is a
 * *contextual* action that always begins from an existing membership (it lives in the Membership /
 * Member Workspace Billing sections), so a global "Record payment" dashboard shortcut was operational
 * noise — it led to an unfiltered list, not a payable membership — and was removed (polish sprint).
 */
export interface QuickActionPermissions {
  canAddMember: boolean;
  canSellMembership: boolean;
}

export async function QuickActions({ perms }: { perms: QuickActionPermissions }) {
  if (!perms.canAddMember && !perms.canSellMembership) return null;
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
    </div>
  );
}
