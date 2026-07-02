import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * PULSE CreationFAB (Catalog §12.2) — the mobile thumb-zone **create** action, scoped to
 * list/index screens whose primary job is creating a new entity (Members / Memberships /
 * Plans / Staff — design-system-v1.2 §5.2). It *relocates* the screen's single PageHeader
 * primary below `md`; it is never an additional action, never appears on detail/form/
 * dashboard/report/settings screens, and never coexists with a Sticky Mobile Action Bar.
 *
 * Anchoring (fixed, safe-area aware) comes from the `.fab-anchor` base style (§5.8); the
 * rendered spacer keeps the last list row scrollable clear of the floating button.
 */
export interface CreationFabProps {
  /** Accessible name (e.g. "Add member") — mirrors the desktop primary exactly. */
  label: string;
  href: string;
  icon?: ReactNode;
}

export function CreationFab({ label, href, icon }: CreationFabProps) {
  return (
    <>
      {/* In-flow spacer so the FAB never overlaps the last row (§5.2). */}
      <div aria-hidden className="h-(--fab-size) md:hidden" />
      <Link
        href={href}
        aria-label={label}
        className="fab-anchor inline-flex size-(--fab-size) items-center justify-center rounded-full bg-primary text-primary-foreground shadow-(--shadow-md) transition-colors duration-(--duration-fast) ease-standard hover:bg-primary-hover md:hidden [&_svg]:size-6"
      >
        {icon ?? <Plus aria-hidden />}
      </Link>
    </>
  );
}
